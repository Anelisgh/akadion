package com.example.akadion.service;

import com.example.akadion.dto.DocumentResponseDto;
import com.example.akadion.entity.Curs;
import com.example.akadion.entity.Document;
import com.example.akadion.entity.DocumentStatusIndex;
import com.example.akadion.entity.Saptamana;
import com.example.akadion.exception.AccesInterzisException;
import com.example.akadion.repository.DocumentRepository;
import com.example.akadion.repository.SaptamanaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private static final Set<String> PERMITTED_EXTENSIONS = Set.of("pdf", "docx", "pptx", "zip");

    private final DocumentRepository documentRepository;
    private final SaptamanaRepository saptamanaRepository;
    private final MinioStorageService minioStorageService;
    private final RagIngestService ragIngestService;

    public List<DocumentResponseDto> listaDocumente(Long saptamanaId, Long callerId, String callerRole) {
        Saptamana saptamana = saptamanaRepository.findWithCursAndProfesorById(saptamanaId)
                .orElseThrow(() -> new IllegalArgumentException("S─âpt─âm├óna nu a fost g─âsit─â."));

        if (!"ADMIN".equals(callerRole)) {
            if (!saptamana.getCurs().getProfesor().getId().equals(callerId)) {
                throw new AccesInterzisException("Nu ave╚¢i acces la documentele acestei s─âpt─âm├óni.");
            }
        }

        return documentRepository.findBySaptamanaIdAndActivTrue(saptamanaId).stream()
                .map(this::toResponseDto)
                .toList();
    }

    public DocumentResponseDto adaugaDocument(Long saptamanaId, Long profesorId, MultipartFile file, String titlu) {
        Saptamana saptamana = saptamanaRepository.findWithCursAndProfesorById(saptamanaId)
                .orElseThrow(() -> new IllegalArgumentException("S─âpt─âm├óna nu a fost g─âsit─â."));

        Curs curs = saptamana.getCurs();
        if (!curs.getProfesor().getId().equals(profesorId)) {
            throw new AccesInterzisException("Nu ave╚¢i permisiunea de a ad─âuga un document ├«n aceast─â s─âpt─âm├ón─â.");
        }

        validateFile(file);

        String path = minioStorageService.uploadFile(file, curs.getId(), saptamana.getId());

        Document document = Document.builder()
                .saptamana(saptamana)
                .titlu(titlu)
                .pathMinio(path)
                .statusIndex(DocumentStatusIndex.PRELUAT)
                .activ(true)
                .build();

        try {
            document = documentRepository.save(document);
        } catch (Exception e) {
            log.error("Eroare la salvarea documentului ├«n DB local. ╚ÿtergem fi╚Öierul orfan din MinIO.", e);
            minioStorageService.deleteFile(path);
            throw e;
        }

        boolean succes = ragIngestService.trimiteLaIngest(document, saptamana, curs);

        document.setStatusIndex(succes ? DocumentStatusIndex.TRIMIS : DocumentStatusIndex.ERONAT);
        Document savedDocument = documentRepository.save(document);

        log.info("Document ad─âugat cu succes: docId={}, statusIndex={}", savedDocument.getId(), savedDocument.getStatusIndex());
        return toResponseDto(savedDocument);
    }

    public DocumentResponseDto modificaDocument(Long documentId, Long profesorId, String titlu, MultipartFile fisierNou) {
        Document document = documentRepository.findWithSaptamanaAndCursAndProfesorById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Documentul nu a fost g─âsit."));

        Saptamana saptamana = document.getSaptamana();
        Curs curs = saptamana.getCurs();
        if (!curs.getProfesor().getId().equals(profesorId)) {
            throw new AccesInterzisException("Nu ave╚¢i permisiunea de a modifica acest document.");
        }

        if (fisierNou != null) {
            validateFile(fisierNou);
            String pathVechi = document.getPathMinio();

            String pathNou = minioStorageService.uploadFile(fisierNou, curs.getId(), saptamana.getId());
            minioStorageService.deleteFile(pathVechi);

            document.setPathMinio(pathNou);
            document.setStatusIndex(DocumentStatusIndex.PRELUAT);
            if (titlu != null) {
                document.setTitlu(titlu);
            }

            document = documentRepository.save(document);

            boolean succes = ragIngestService.trimiteLaIngest(document, saptamana, curs);
            document.setStatusIndex(succes ? DocumentStatusIndex.TRIMIS : DocumentStatusIndex.ERONAT);
            document = documentRepository.save(document);

        } else if (titlu != null) {
            document.setTitlu(titlu);
            document = documentRepository.save(document);

            boolean succes = ragIngestService.trimiteLaIngest(document, saptamana, curs);
            document.setStatusIndex(succes ? DocumentStatusIndex.TRIMIS : DocumentStatusIndex.ERONAT);
            document = documentRepository.save(document);
        }

        log.info("Document modificat cu succes: docId={}, statusIndex={}", document.getId(), document.getStatusIndex());
        return toResponseDto(document);
    }

    public void stergeDocument(Long documentId, Long profesorId) {
        Document document = documentRepository.findWithSaptamanaAndCursAndProfesorById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Documentul nu a fost g─âsit."));

        if (!document.getSaptamana().getCurs().getProfesor().getId().equals(profesorId)) {
            throw new AccesInterzisException("Nu ave╚¢i permisiunea de a ╚Öterge acest document.");
        }

        document.setActiv(false);
        documentRepository.save(document);

        if (document.getPathMinio() != null && !document.getPathMinio().isBlank()) {
            minioStorageService.deleteFile(document.getPathMinio());
        }

        ragIngestService.stergeDinIngest(documentId);
        log.info("Document ╚Öters cu succes: docId={}", documentId);
    }

    public DocumentResponseDto reincearcaIngest(Long documentId, Long profesorId) {
        Document document = documentRepository.findWithSaptamanaAndCursAndProfesorById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Documentul nu a fost g─âsit."));

        if (!document.getSaptamana().getCurs().getProfesor().getId().equals(profesorId)) {
            throw new AccesInterzisException("Nu ave╚¢i permisiunea de a re├«ncerca indexarea pentru acest document.");
        }

        if (document.getStatusIndex() == DocumentStatusIndex.TRIMIS) {
            throw new IllegalArgumentException("Documentul este deja indexat cu succes.");
        }

        boolean succes = ragIngestService.trimiteLaIngest(document, document.getSaptamana(), document.getSaptamana().getCurs());
        document.setStatusIndex(succes ? DocumentStatusIndex.TRIMIS : DocumentStatusIndex.ERONAT);
        Document savedDocument = documentRepository.save(document);

        log.info("Re├«ncercare indexare finalizat─â: docId={}, statusIndex={}", savedDocument.getId(), savedDocument.getStatusIndex());
        return toResponseDto(savedDocument);
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Fi╚Öierul ├«nc─ârcat este gol.");
        }
        String originalName = file.getOriginalFilename();
        String ext = (originalName != null && originalName.contains(".")) 
                ? originalName.substring(originalName.lastIndexOf(".") + 1).toLowerCase() 
                : "";
        if (!PERMITTED_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException("Tip de fi╚Öier nepermis. Sunt permise doar: pdf, docx, pptx, zip.");
        }
    }

    private DocumentResponseDto toResponseDto(Document document) {
        String urlVizualizare = minioStorageService.getPresignedPreviewUrl(document.getPathMinio());
        String urlDescarcare = minioStorageService.getPresignedDownloadUrl(document.getPathMinio());
        return new DocumentResponseDto(
                document.getId(),
                document.getTitlu(),
                document.getStatusIndex().name(),
                document.getActiv(),
                urlVizualizare,
                urlDescarcare
        );
    }
}