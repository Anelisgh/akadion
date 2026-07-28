package com.example.akadion.dto;

import java.time.OffsetDateTime;

public record ConversatieDTO(
    Long id,
    String titlu,
    OffsetDateTime createdAt
) {}
