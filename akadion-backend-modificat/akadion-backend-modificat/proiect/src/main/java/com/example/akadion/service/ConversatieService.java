package com.example.akadion.service;

import com.example.akadion.dto.AkyChatRequestDto;
import com.example.akadion.dto.AkyChatResponseDto;
import com.example.akadion.dto.AkyMessageDto;
import com.example.akadion.dto.AkySursaDocumentDto;
import com.example.akadion.entity.Conversatie;
import com.example.akadion.entity.Curs;
import com.example.akadion.entity.MesajChat;
import com.example.akadion.entity.RolMesaj;
import com.example.akadion.entity.User;
import com.example.akadion.exception.AccesInterzisException;
import com.example.akadion.exception.ResursaNegasitaException;
import com.example.akadion.exception.TooManyRequestsException;
import com.example.akadion.repository.ConversatieRepository;
import com.example.akadion.repository.CursRepository;
import com.example.akadion.repository.MesajChatRepository;
import com.example.akadion.repository.UserCursRepository;
import com.example.akadion.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversatieService {

    private final ConversatieRepository conversatieRepository;
    private final MesajChatRepository mesajChatRepository;
    private final UserRepository userRepository;
    private final CursRepository cursRepository;
    private final UserCursRepository userCursRepository;
    private final RagChatService ragChatService;

    // Simplu rate limiter in-memory: max 10 mesaje/minut per user
    private final Map<Long, Deque<Instant>> rateLimitMap = new ConcurrentHashMap<>();
    private static final int MAX_MESSAGES_PER_MINUTE = 10;

    @Transactional
    public MesajChat salveazaIntrebare(Long conversatieId, Long userId, Long cursIdParam, String intrebare) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResursaNegasitaException("User not found"));

        Conversatie conversatie;
        Curs curs;

        if (conversatieId == null) {
            // Conversatie noua
            curs = cursRepository.findById(cursIdParam)
                    .orElseThrow(() -> new ResursaNegasitaException("Curs not found"));
            verificaAcces(user, curs, true);
            verificaRateLimit(userId);

            conversatie = new Conversatie();
            conversatie.setUser(user);
            conversatie.setCurs(curs);

            // Titlu generat automat din primul mesaj (maxim 40 caractere)
            String titlu = intrebare.replaceAll("\\s+", " ").trim();
            if (titlu.length() > 40) {
                titlu = titlu.substring(0, 37) + "...";
            }
            conversatie.setTitlu(titlu);
            conversatie = conversatieRepository.save(conversatie);
        } else {
            // Conversatie existenta
            conversatie = conversatieRepository.findById(conversatieId)
                    .orElseThrow(() -> new ResursaNegasitaException("Conversatia nu exista"));

            if (!conversatie.getUser().getId().equals(userId)) {
                throw new AccesInterzisException("Nu sunteți proprietarul acestei conversații.");
            }
            if (!conversatie.getActiv()) {
                throw new IllegalArgumentException("Conversația a fost ștearsă.");
            }

            curs = conversatie.getCurs();
            verificaAcces(user, curs, true);
            verificaRateLimit(userId);

            // Evitam duplicarea intrebarii in caz de retry dupa fail RAG
            List<MesajChat> lastMessages = mesajChatRepository.findTop10ByConversatieIdOrderByCreatedAtDesc(conversatieId);
            if (!lastMessages.isEmpty()) {
                MesajChat lastMessage = lastMessages.get(0);
                if (lastMessage.getRol() == RolMesaj.UTILIZATOR && lastMessage.getContinut().equals(intrebare)) {
                    return lastMessage; // Omitere salvare duplicat
                }
            }
        }

        MesajChat mesaj = new MesajChat();
        mesaj.setConversatie(conversatie);
        mesaj.setRol(RolMesaj.UTILIZATOR);
        mesaj.setContinut(intrebare);
        return mesajChatRepository.save(mesaj);
    }

    public AkyChatResponseDto obtineRaspunsRag(Long conversatieId, Long userId, String intrebare) {
        Conversatie conversatie = conversatieRepository.findById(conversatieId)
                .orElseThrow(() -> new ResursaNegasitaException("Conversatia nu exista"));

        List<MesajChat> last10 = mesajChatRepository.findTop10ByConversatieIdOrderByCreatedAtDesc(conversatieId);
        // Excludem intrebarea curenta din istoric (e in ultimul, care tocmai a fost salvat)
        // RAG are nevoie de istoric STRICT FARA intrebarea curenta pe care o punem acum.
        // Daca intrebarea curenta e in DB, e prima din lista DESC.
        List<MesajChat> istoricPtRag = new ArrayList<>(last10);
        if (!istoricPtRag.isEmpty() && istoricPtRag.get(0).getContinut().equals(intrebare) && istoricPtRag.get(0).getRol() == RolMesaj.UTILIZATOR) {
            istoricPtRag.remove(0);
        }

        Collections.reverse(istoricPtRag);

        List<AkyMessageDto> istoricMapped = istoricPtRag.stream()
                .map(m -> new AkyMessageDto(
                        m.getRol() == RolMesaj.UTILIZATOR ? "user" : "assistant",
                        m.getContinut()
                ))
                .toList();

        AkyChatRequestDto requestDto = new AkyChatRequestDto(intrebare, istoricMapped);
        return ragChatService.intreabaAky(userId, conversatie.getCurs().getId(), requestDto);
    }

    @Transactional
    public MesajChat salveazaRaspuns(Long conversatieId, AkyChatResponseDto raspuns) {
        Conversatie conversatie = conversatieRepository.findById(conversatieId)
                .orElseThrow(() -> new ResursaNegasitaException("Conversatia nu exista"));

        String surseCsv = null;
        if (raspuns.surseFolosite() != null && !raspuns.surseFolosite().isEmpty()) {
            surseCsv = raspuns.surseFolosite().stream()
                    .filter(s -> s.documentId() != null)
                    .map(s -> s.documentId().toString())
                    .collect(Collectors.joining(","));
        }

        MesajChat mesaj = new MesajChat();
        mesaj.setConversatie(conversatie);
        mesaj.setRol(RolMesaj.ASISTENT);
        mesaj.setContinut(raspuns.raspuns());
        mesaj.setSurseFolosite(surseCsv);

        return mesajChatRepository.save(mesaj);
    }

    private void verificaAcces(User user, Curs curs, boolean scriere) {
        boolean acces = switch (user.getRol().getDenumire()) {
            case "PROFESOR" -> curs.getProfesor().getId().equals(user.getId());
            case "STUDENT" -> scriere
                ? userCursRepository.existsByStudentIdAndCursIdAndActivTrue(user.getId(), curs.getId())
                : userCursRepository.existsByStudentIdAndCursId(user.getId(), curs.getId());
            default -> false;
        };
        if (!acces) throw new AccesInterzisException("Nu aveți acces la acest curs.");
    }

    private void verificaRateLimit(Long userId) {
        Instant now = Instant.now();
        Instant oneMinuteAgo = now.minus(1, ChronoUnit.MINUTES);

        rateLimitMap.compute(userId, (id, timestamps) -> {
            if (timestamps == null) {
                timestamps = new ConcurrentLinkedDeque<>();
            }
            // Remove old timestamps
            while (!timestamps.isEmpty() && timestamps.peekFirst().isBefore(oneMinuteAgo)) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= MAX_MESSAGES_PER_MINUTE) {
                throw new TooManyRequestsException("Ați depășit limita de mesaje (10/minut). Vă rugăm să așteptați.");
            }
            timestamps.addLast(now);
            return timestamps;
        });
    }

    public List<Conversatie> obtineConversatiiActive(Long userId, Long cursId) {
        Curs curs = cursRepository.findById(cursId)
                .orElseThrow(() -> new ResursaNegasitaException("Curs not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResursaNegasitaException("User not found"));

        verificaAcces(user, curs, false);
        return conversatieRepository.findByUserIdAndCursIdAndActivTrueOrderByCreatedAtDesc(userId, cursId);
    }

    public List<MesajChat> obtineIstoric(Long userId, Long conversatieId) {
        Conversatie conversatie = conversatieRepository.findById(conversatieId)
                .orElseThrow(() -> new ResursaNegasitaException("Conversatia nu exista"));
        if (!conversatie.getUser().getId().equals(userId)) {
            throw new AccesInterzisException("Nu sunteți proprietarul acestei conversații.");
        }
        return mesajChatRepository.findByConversatieIdOrderByCreatedAtAsc(conversatieId);
    }

    public List<Conversatie> obtineToateConversatiileActive(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResursaNegasitaException("User not found"));
        return conversatieRepository.findByUserIdAndActivTrueOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public void stergeConversatie(Long userId, Long conversatieId) {
        Conversatie conversatie = conversatieRepository.findById(conversatieId)
                .orElseThrow(() -> new ResursaNegasitaException("Conversatia nu exista"));
        if (!conversatie.getUser().getId().equals(userId)) {
            throw new AccesInterzisException("Nu sunteți proprietarul acestei conversații.");
        }
        conversatie.setActiv(false);
        conversatieRepository.save(conversatie);
    }
}
