package com.example.akadion.controller;

import com.example.akadion.dto.AkyChatResponseDto;
import com.example.akadion.dto.ConversatieDTO;
import com.example.akadion.dto.MesajChatDTO;
import com.example.akadion.dto.NouaIntrebareRequest;
import com.example.akadion.dto.RagRaspunsResponse;
import com.example.akadion.entity.Conversatie;
import com.example.akadion.entity.MesajChat;
import com.example.akadion.entity.User;
import com.example.akadion.exception.UserNotFoundException;
import com.example.akadion.repository.UserRepository;
import com.example.akadion.service.ConversatieService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STUDENT', 'PROFESOR')")
public class ConversatieController {

    private final ConversatieService conversatieService;
    private final UserRepository userRepository;

    @GetMapping("/cursuri/{cursId}/conversatii")
    public List<ConversatieDTO> getConversatii(@PathVariable Long cursId, @AuthenticationPrincipal OidcUser oidcUser) {
        User user = getLoggedUser(oidcUser);
        List<Conversatie> conversatii = conversatieService.obtineConversatiiActive(user.getId(), cursId);
        return conversatii.stream()
                .map(c -> new ConversatieDTO(c.getId(), c.getTitlu(), c.getCreatedAt()))
                .collect(Collectors.toList());
    }

    @PostMapping("/cursuri/{cursId}/conversatii/mesaje")
    public RagRaspunsResponse creareConversatieSiMesaj(
            @PathVariable Long cursId,
            @Valid @RequestBody NouaIntrebareRequest request,
            @AuthenticationPrincipal OidcUser oidcUser) {
        
        User user = getLoggedUser(oidcUser);
        
        // Pas 1
        MesajChat intrebare = conversatieService.salveazaIntrebare(null, user.getId(), cursId, request.intrebare());
        
        // Pas 2
        AkyChatResponseDto ragResponse = conversatieService.obtineRaspunsRag(
                intrebare.getConversatie().getId(), user.getId(), request.intrebare());
        
        // Pas 3
        MesajChat raspuns = conversatieService.salveazaRaspuns(intrebare.getConversatie().getId(), ragResponse);
        
        return new RagRaspunsResponse(
                intrebare.getConversatie().getId(),
                new MesajChatDTO(raspuns.getId(), raspuns.getRol(), raspuns.getContinut(), raspuns.getSurseFolosite(), raspuns.getCreatedAt())
        );
    }

    @GetMapping("/conversatii/{id}/mesaje")
    public List<MesajChatDTO> getIstoric(@PathVariable Long id, @AuthenticationPrincipal OidcUser oidcUser) {
        User user = getLoggedUser(oidcUser);
        List<MesajChat> istoric = conversatieService.obtineIstoric(user.getId(), id);
        return istoric.stream()
                .map(m -> new MesajChatDTO(m.getId(), m.getRol(), m.getContinut(), m.getSurseFolosite(), m.getCreatedAt()))
                .collect(Collectors.toList());
    }

    @PostMapping("/conversatii/{id}/mesaje")
    public MesajChatDTO adaugaMesaj(
            @PathVariable Long id,
            @Valid @RequestBody NouaIntrebareRequest request,
            @AuthenticationPrincipal OidcUser oidcUser) {
        
        User user = getLoggedUser(oidcUser);
        
        // Pas 1
        MesajChat intrebare = conversatieService.salveazaIntrebare(id, user.getId(), null, request.intrebare());
        
        // Pas 2
        AkyChatResponseDto ragResponse = conversatieService.obtineRaspunsRag(
                intrebare.getConversatie().getId(), user.getId(), request.intrebare());
        
        // Pas 3
        MesajChat raspuns = conversatieService.salveazaRaspuns(intrebare.getConversatie().getId(), ragResponse);
        
        return new MesajChatDTO(raspuns.getId(), raspuns.getRol(), raspuns.getContinut(), raspuns.getSurseFolosite(), raspuns.getCreatedAt());
    }

    @DeleteMapping("/conversatii/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void stergeConversatie(@PathVariable Long id, @AuthenticationPrincipal OidcUser oidcUser) {
        User user = getLoggedUser(oidcUser);
        conversatieService.stergeConversatie(user.getId(), id);
    }

    private User getLoggedUser(OidcUser oidcUser) {
        return userRepository.findByIdKeycloak(oidcUser.getSubject())
                .orElseThrow(() -> new UserNotFoundException("Utilizatorul autentificat nu are cont local."));
    }
}
