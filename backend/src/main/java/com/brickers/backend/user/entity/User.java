package com.brickers.backend.user.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "users")
@CompoundIndexes({
        @CompoundIndex(name = "ux_provider_providerId", def = "{'provider': 1, 'providerId': 1}", unique = true)
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    private String provider;
    private String providerId;

    @Indexed(name = "ix_email")
    private String email;

    // Nickname uniqueness is enforced at DB level in MongoIndexInitializer.
    private String nickname;

    private String profileImage;
    private String bio;

    private UserRole role;
    private MembershipPlan membershipPlan;
    private AccountState accountState;

    private LocalDateTime lastLoginAt;

    private LocalDateTime deletedAt;
    private LocalDateTime suspendedAt;
    private String suspendedReason;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public void ensureDefaults() {
        if (role == null) {
            role = UserRole.USER;
        }
        if (membershipPlan == null) {
            membershipPlan = MembershipPlan.FREE;
        }
        if (accountState == null) {
            accountState = AccountState.ACTIVE;
        }

        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (lastLoginAt == null) {
            lastLoginAt = now;
        }
    }

    public void markDeleted() {
        this.accountState = AccountState.REQUESTED;
        this.deletedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void suspend(String reason) {
        this.accountState = AccountState.SUSPENDED;
        this.suspendedAt = LocalDateTime.now();
        this.suspendedReason = reason;
        this.updatedAt = LocalDateTime.now();
    }
}
