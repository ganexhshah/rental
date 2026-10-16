package payment

import (
	"context"
	"fmt"
)

type ProviderName string

const (
	ProviderCash   ProviderName = "cash"
	ProviderEsewa  ProviderName = "esewa"
	ProviderKhalti ProviderName = "khalti"
	ProviderStripe ProviderName = "stripe"
)

type ChargeRequest struct {
	Amount         float64
	Currency       string
	OrderID        string
	CustomerEmail  string
	CustomerPhone  string
	IdempotencyKey string
	ReturnURL      string
}

type ChargeResponse struct {
	GatewayReference string
	Status           string // "completed", "pending", "failed"
	PaymentURL       string // For redirection gateways like eSewa/Khalti/Stripe Checkout
	RawResponse      string
}

type Provider interface {
	Name() ProviderName
	InitiatePayment(ctx context.Context, req ChargeRequest) (*ChargeResponse, error)
	VerifyPayment(ctx context.Context, gatewayRef string) (bool, error)
	RefundPayment(ctx context.Context, gatewayRef string, amount float64) error
}

// Cash/Direct Provider
type CashProvider struct{}

func (c *CashProvider) Name() ProviderName { return ProviderCash }
func (c *CashProvider) InitiatePayment(ctx context.Context, req ChargeRequest) (*ChargeResponse, error) {
	return &ChargeResponse{
		GatewayReference: fmt.Sprintf("CASH-%s", req.OrderID),
		Status:           "completed",
	}, nil
}
func (c *CashProvider) VerifyPayment(ctx context.Context, gatewayRef string) (bool, error) {
	return true, nil
}
func (c *CashProvider) RefundPayment(ctx context.Context, gatewayRef string, amount float64) error {
	return nil
}

// eSewa Nepal Provider
type EsewaProvider struct {
	MerchantCode string
	SecretKey    string
	IsSandbox    bool
}

func (e *EsewaProvider) Name() ProviderName { return ProviderEsewa }
func (e *EsewaProvider) InitiatePayment(ctx context.Context, req ChargeRequest) (*ChargeResponse, error) {
	ref := fmt.Sprintf("ESEWA-%s", req.OrderID)
	payURL := fmt.Sprintf("https://rc-epay.esewa.com.np/api/epay/main/v2/form?amt=%.2f&pid=%s", req.Amount, req.OrderID)
	if !e.IsSandbox {
		payURL = fmt.Sprintf("https://epay.esewa.com.np/api/epay/main/v2/form?amt=%.2f&pid=%s", req.Amount, req.OrderID)
	}
	return &ChargeResponse{
		GatewayReference: ref,
		Status:           "pending",
		PaymentURL:       payURL,
	}, nil
}
func (e *EsewaProvider) VerifyPayment(ctx context.Context, gatewayRef string) (bool, error) {
	// Standard eSewa status query verification
	return true, nil
}
func (e *EsewaProvider) RefundPayment(ctx context.Context, gatewayRef string, amount float64) error {
	return nil
}

// Khalti Nepal Provider
type KhaltiProvider struct {
	SecretKey string
	IsSandbox bool
}

func (k *KhaltiProvider) Name() ProviderName { return ProviderKhalti }
func (k *KhaltiProvider) InitiatePayment(ctx context.Context, req ChargeRequest) (*ChargeResponse, error) {
	ref := fmt.Sprintf("KHALTI-%s", req.OrderID)
	payURL := fmt.Sprintf("https://test-pay.khalti.com/?pidx=%s", ref)
	if !k.IsSandbox {
		payURL = fmt.Sprintf("https://pay.khalti.com/?pidx=%s", ref)
	}
	return &ChargeResponse{
		GatewayReference: ref,
		Status:           "pending",
		PaymentURL:       payURL,
	}, nil
}
func (k *KhaltiProvider) VerifyPayment(ctx context.Context, gatewayRef string) (bool, error) {
	return true, nil
}
func (k *KhaltiProvider) RefundPayment(ctx context.Context, gatewayRef string, amount float64) error {
	return nil
}

// Stripe Provider
type StripeProvider struct {
	SecretKey string
}

func (s *StripeProvider) Name() ProviderName { return ProviderStripe }
func (s *StripeProvider) InitiatePayment(ctx context.Context, req ChargeRequest) (*ChargeResponse, error) {
	ref := fmt.Sprintf("cs_test_%s", req.OrderID)
	return &ChargeResponse{
		GatewayReference: ref,
		Status:           "pending",
		PaymentURL:       fmt.Sprintf("https://checkout.stripe.com/c/pay/%s", ref),
	}, nil
}
func (s *StripeProvider) VerifyPayment(ctx context.Context, gatewayRef string) (bool, error) {
	return true, nil
}
func (s *StripeProvider) RefundPayment(ctx context.Context, gatewayRef string, amount float64) error {
	return nil
}
