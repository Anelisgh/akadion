package com.example.akadion.config;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MinioConfig {
    
    @Value("${minio.url}") 
    private String url;

    @Value("${minio.external-url}") 
    private String externalUrl;
    
    @Value("${minio.access-key}") 
    private String accessKey;
    
    @Value("${minio.secret-key}") 
    private String secretKey;

    @Value("${minio.bucket}")
    private String bucket;

    @Value("${minio.auto-create-bucket:false}")
    private boolean autoCreateBucket;

    @Bean
    @org.springframework.context.annotation.Primary
    public MinioClient minioClient() {
        MinioClient client = MinioClient.builder()
            .endpoint(url)
            .credentials(accessKey, secretKey)
            .build();
            
        if (autoCreateBucket) {
            try {
                boolean exists = client.bucketExists(io.minio.BucketExistsArgs.builder().bucket(bucket).build());
                if (!exists) {
                    client.makeBucket(io.minio.MakeBucketArgs.builder().bucket(bucket).build());
                }
            } catch (Exception e) {
                throw new RuntimeException("Nu s-a putut crea bucket-ul in MinIO: " + e.getMessage(), e);
            }
        }
        
        return client;
    }

    @Bean(name = "externalMinioClient")
    public MinioClient externalMinioClient() {
        return MinioClient.builder()
            .endpoint(externalUrl)
            .credentials(accessKey, secretKey)
            .build();
    }
}
