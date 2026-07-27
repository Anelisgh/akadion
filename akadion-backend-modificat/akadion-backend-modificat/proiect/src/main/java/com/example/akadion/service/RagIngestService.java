package com.example.akadion.service;

import com.example.akadion.entity.Curs;
import com.example.akadion.entity.Document;
import com.example.akadion.entity.Saptamana;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class RagIngestService {

    private final RestClient.Builder restClientBuilder;

    @Value("${app.rag.base-url}")
    private String ragBaseUrl;

    private RestClient restClient;

    @PostConstruct
    void init() {
        this.restClient = restClientBuilder.build();
    }

    public boolean trimiteLaIngest(Document document, Saptamana saptamana, Curs curs) {
        try {
            String path = document.getPathMinio();
            String extensie = (path != null && path.contains(".")) 
                    ? path.substring(path.lastIndexOf(".") + 1).toLowerCase() 
                    : "";

            restClient.post()
                    .uri(ragBaseUrl + "/ingest")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "documentId", document.getId(),
                            "cursId", curs.getId(),
                            "saptamanaId", saptamana.getId(),
                            "profesorId", curs.getProfesor().getId(),
                            "titlu", document.getTitlu(),
                            "pathMinio", path != null ? path : "",
                            "extensie", extensie,
                            "cursDenumire", curs.getDenumire(),
                            "nrSaptamana", saptamana.getNrSaptamana()
                    ))
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception e) {
            log.error("Eroare la trimiterea documentului {} către RAG: {}", document.getId(), e.getMessage());
            return false;
        }
    }

    public void stergeDinIngest(Long documentId) {
        try {
            restClient.delete()
                    .uri(ragBaseUrl + "/ingest/" + documentId)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.error("Eroare la ștergerea documentului {} din RAG: {}", documentId, e.getMessage());
        }
    }
}
