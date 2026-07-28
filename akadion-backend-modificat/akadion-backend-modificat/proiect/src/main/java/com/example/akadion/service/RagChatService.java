package com.example.akadion.service;

import com.example.akadion.dto.AkyChatRequestDto;
import com.example.akadion.dto.AkyChatResponseDto;
import com.example.akadion.dto.AkySursaDocumentDto;
import com.example.akadion.exception.RagChatException;
import com.example.akadion.repository.DocumentRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class RagChatService {

    private final RestClient.Builder restClientBuilder;
    private final DocumentRepository documentRepository;

    @Value("${app.rag.base-url}")
    private String ragBaseUrl;

    private RestClient restClient;

    @PostConstruct
    void init() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
        requestFactory.setReadTimeout((int) Duration.ofSeconds(30).toMillis());

        this.restClient = restClientBuilder
                .requestFactory(requestFactory)
                .build();
    }

    public AkyChatResponseDto intreabaAky(Long userId, Long cursId, AkyChatRequestDto request) {
        try {
            // Map request for Python RAG contract (contract-rag.md)
            List<Map<String, String>> istoricMapped = request.istoricConversatie().stream()
                    .map(msg -> Map.of(
                            "role", "user".equalsIgnoreCase(msg.sender()) ? "user" : "assistant",
                            "content", msg.text()
                    ))
                    .toList();

            Map<String, Object> ragPayload = Map.of(
                    "userId", userId,
                    "cursId", cursId,
                    "intrebare", request.intrebare(),
                    "istoricConversatie", istoricMapped
            );

            log.info("Trimitere cerere RAG Chat pentru utilizatorul {} la cursul {}.", userId, cursId);

            Map<String, Object> responseMap = restClient.post()
                    .uri(ragBaseUrl + "/chat")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(ragPayload)
                    .retrieve()
                    .body(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {});

            if (responseMap == null) {
                throw new RagChatException("Serviciul RAG a returnat un răspuns vid.");
            }

            Object rawRaspuns = responseMap.get("raspuns");
            String raspunsText = rawRaspuns != null ? rawRaspuns.toString() : "";
            List<AkySursaDocumentDto> surseDtos = new ArrayList<>();

            Object rawSurse = responseMap.get("surseFolosite");
            if (rawSurse instanceof List<?> list) {
                for (Object item : list) {
                    if (item instanceof Number numDocId) {
                        Long docId = numDocId.longValue();
                        documentRepository.findById(docId).ifPresent(doc -> {
                            surseDtos.add(new AkySursaDocumentDto(doc.getId(), doc.getTitlu()));
                        });
                    } else if (item instanceof Map<?, ?> mapDoc) {
                        Object rawId = mapDoc.get("documentId");
                        Object rawNume = mapDoc.get("numeFisier");
                        String numeFisier = rawNume != null ? rawNume.toString() : "Document";
                        Long docId = rawId instanceof Number n ? n.longValue() : null;
                        surseDtos.add(new AkySursaDocumentDto(docId, numeFisier));
                    }
                }
            }

            return new AkyChatResponseDto(raspunsText, surseDtos);

        } catch (RagChatException e) {
            throw e;
        } catch (Exception e) {
            log.error("Eroare la comunicarea cu RAG Chat pentru cursul {}: {}", cursId, e.getMessage(), e);
            throw new RagChatException("Serviciul Aky este temporar indisponibil. Încearcă din nou în câteva momente.", e);
        }
    }
}
