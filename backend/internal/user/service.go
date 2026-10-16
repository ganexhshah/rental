package user

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rental/backend/internal/auth"
	"github.com/rental/backend/pkg/pagination"
)

var (
	ErrUserNotFound = errors.New("user not found")
)

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

func (s *Service) ListUsers(ctx context.Context, tenantID uuid.UUID, p pagination.Params) ([]User, pagination.Meta, error) {
	where := "WHERE tenant_id = $1"
	args := []any{tenantID}
	argIdx := 2

	if p.Search != "" {
		where += fmt.Sprintf(" AND (LOWER(full_name) LIKE LOWER($%d) OR LOWER(email) LIKE LOWER($%d))", argIdx, argIdx)
		args = append(args, "%"+p.Search+"%")
		argIdx++
	}

	var total int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM users %s", where)
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, pagination.Meta{}, fmt.Errorf("failed to count users: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT id, tenant_id, email, full_name, COALESCE(phone, ''), role, status, COALESCE(avatar_url, ''), created_at, updated_at
		FROM users
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)
	args = append(args, p.Limit, p.Offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, pagination.Meta{}, fmt.Errorf("failed to list users: %w", err)
	}
	defer rows.Close()

	users := make([]User, 0)
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.TenantID, &u.Email, &u.FullName, &u.Phone, &u.Role, &u.Status, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, pagination.Meta{}, err
		}
		users = append(users, u)
	}

	return users, pagination.BuildMeta(total, p), nil
}

func (s *Service) CreateUser(ctx context.Context, tenantID uuid.UUID, req CreateUserRequest) (*User, error) {
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	userID := uuid.New()
	query := `
		INSERT INTO users (id, tenant_id, email, password_hash, full_name, phone, role, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
		RETURNING id, tenant_id, email, full_name, COALESCE(phone, ''), role, status, COALESCE(avatar_url, ''), created_at, updated_at
	`

	var u User
	err = s.pool.QueryRow(ctx, query, userID, tenantID, strings.ToLower(req.Email), hash, req.FullName, req.Phone, req.Role).Scan(
		&u.ID, &u.TenantID, &u.Email, &u.FullName, &u.Phone, &u.Role, &u.Status, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert user: %w", err)
	}

	_ = s.RecordAuditLog(ctx, tenantID, &u.ID, u.Email, "USER_CREATED", "user", &u.ID, map[string]any{"role": u.Role}, "", "")

	return &u, nil
}

func (s *Service) GetUser(ctx context.Context, tenantID, userID uuid.UUID) (*User, error) {
	var u User
	query := `
		SELECT id, tenant_id, email, full_name, COALESCE(phone, ''), role, status, COALESCE(avatar_url, ''), created_at, updated_at
		FROM users
		WHERE tenant_id = $1 AND id = $2
	`
	err := s.pool.QueryRow(ctx, query, tenantID, userID).Scan(
		&u.ID, &u.TenantID, &u.Email, &u.FullName, &u.Phone, &u.Role, &u.Status, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &u, nil
}

func (s *Service) UpdateUser(ctx context.Context, tenantID, userID uuid.UUID, req UpdateUserRequest) (*User, error) {
	current, err := s.GetUser(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}

	if req.FullName != nil {
		current.FullName = *req.FullName
	}
	if req.Phone != nil {
		current.Phone = *req.Phone
	}
	if req.Role != nil {
		current.Role = *req.Role
	}
	if req.Status != nil {
		current.Status = *req.Status
	}
	if req.AvatarURL != nil {
		current.AvatarURL = *req.AvatarURL
	}

	query := `
		UPDATE users
		SET full_name = $1, phone = $2, role = $3, status = $4, avatar_url = $5, updated_at = NOW()
		WHERE tenant_id = $6 AND id = $7
		RETURNING id, tenant_id, email, full_name, COALESCE(phone, ''), role, status, COALESCE(avatar_url, ''), created_at, updated_at
	`

	var updated User
	err = s.pool.QueryRow(ctx, query, current.FullName, current.Phone, current.Role, current.Status, current.AvatarURL, tenantID, userID).Scan(
		&updated.ID, &updated.TenantID, &updated.Email, &updated.FullName, &updated.Phone, &updated.Role, &updated.Status, &updated.AvatarURL, &updated.CreatedAt, &updated.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	_ = s.RecordAuditLog(ctx, tenantID, &updated.ID, updated.Email, "USER_UPDATED", "user", &updated.ID, map[string]any{"role": updated.Role, "status": updated.Status}, "", "")

	return &updated, nil
}

func (s *Service) DeleteUser(ctx context.Context, tenantID, userID uuid.UUID) error {
	cmd, err := s.pool.Exec(ctx, "DELETE FROM users WHERE tenant_id = $1 AND id = $2", tenantID, userID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

func (s *Service) ListRoles(ctx context.Context) ([]Role, error) {
	return []Role{
		{ID: uuid.MustParse("00000000-0000-0000-0000-000000000001"), Name: "Super Administrator", Slug: "admin", Description: "Full unrestricted platform & tenant management"},
		{ID: uuid.MustParse("00000000-0000-0000-0000-000000000002"), Name: "Fleet Manager", Slug: "manager", Description: "Operations, vehicle assignments, and pricing controls"},
		{ID: uuid.MustParse("00000000-0000-0000-0000-000000000003"), Name: "Desk Staff", Slug: "staff", Description: "Check-in/check-out, customer verification, and bookings"},
	}, nil
}

func (s *Service) UpdateUserRole(ctx context.Context, tenantID, userID uuid.UUID, role string) (*User, error) {
	req := UpdateUserRequest{Role: &role}
	return s.UpdateUser(ctx, tenantID, userID, req)
}

func (s *Service) InviteStaff(ctx context.Context, tenantID uuid.UUID, req InviteStaffRequest) (*StaffInvitation, error) {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	token := hex.EncodeToString(b)
	invID := uuid.New()
	expiresAt := time.Now().Add(7 * 24 * time.Hour)

	query := `
		INSERT INTO staff_invitations (id, tenant_id, email, role, token, status, expires_at)
		VALUES ($1, $2, $3, $4, $5, 'pending', $6)
		RETURNING id, created_at
	`
	var inv StaffInvitation
	inv.ID = invID
	inv.TenantID = tenantID
	inv.Email = req.Email
	inv.Role = req.Role
	inv.Token = token
	inv.Status = "pending"
	inv.ExpiresAt = expiresAt

	err := s.pool.QueryRow(ctx, query, invID, tenantID, strings.ToLower(req.Email), req.Role, token, expiresAt).Scan(&inv.ID, &inv.CreatedAt)
	if err != nil {
		return nil, err
	}

	return &inv, nil
}

func (s *Service) RecordAuditLog(ctx context.Context, tenantID uuid.UUID, actorID *uuid.UUID, actorEmail, action, entityType string, entityID *uuid.UUID, metadata map[string]any, ip, ua string) error {
	metaJSON, _ := json.Marshal(metadata)
	if len(metaJSON) == 0 {
		metaJSON = []byte("{}")
	}

	query := `
		INSERT INTO audit_logs (id, tenant_id, actor_id, actor_email, action, entity_type, entity_id, metadata, ip_address, user_agent, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
	`
	_, err := s.pool.Exec(ctx, query, uuid.New(), tenantID, actorID, actorEmail, action, entityType, entityID, metaJSON, ip, ua)
	return err
}

func (s *Service) ListAuditLogs(ctx context.Context, tenantID uuid.UUID) ([]AuditLog, error) {
	query := `
		SELECT id, tenant_id, actor_id, COALESCE(actor_email, 'system'), action, entity_type,
		       entity_id, metadata, COALESCE(ip_address, ''), COALESCE(user_agent, ''), created_at
		FROM audit_logs
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT 100
	`
	rows, err := s.pool.Query(ctx, query, tenantID)
	if err != nil {
		return []AuditLog{}, nil
	}
	defer rows.Close()

	list := make([]AuditLog, 0)
	for rows.Next() {
		var a AuditLog
		if err := rows.Scan(
			&a.ID, &a.TenantID, &a.ActorID, &a.ActorEmail, &a.Action, &a.EntityType,
			&a.EntityID, &a.Metadata, &a.IPAddress, &a.UserAgent, &a.CreatedAt,
		); err == nil {
			list = append(list, a)
		}
	}
	return list, nil
}
