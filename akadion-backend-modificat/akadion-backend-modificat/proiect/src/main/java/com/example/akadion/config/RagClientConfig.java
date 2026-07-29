package com.example.akadion.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RagClientConfig {

    @Bean
    public RestClient ragRestClient(
            @Value("${app.rag.base-url}") String baseUrl,
            @Value("${app.rag.auth.username}") String username,
            @Value("${app.rag.auth.password}") String password) {
        return RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeaders(headers -> headers.setBasicAuth(username, password))
                .build();
    }
}
