package com.example.akadion.repository;

import com.example.akadion.entity.Conversatie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConversatieRepository extends JpaRepository<Conversatie, Long> {
    List<Conversatie> findByUserIdAndCursIdAndActivTrueOrderByCreatedAtDesc(Long userId, Long cursId);
    List<Conversatie> findByUserIdAndActivTrueOrderByCreatedAtDesc(Long userId);
}
