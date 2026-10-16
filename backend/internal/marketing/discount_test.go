package marketing

import (
	"testing"
)

func TestCalculateDiscount(t *testing.T) {
	tests := []struct {
		name          string
		discountType  string
		discountValue float64
		rentalAmount  float64
		maxDiscount   float64
		expected      float64
	}{
		{
			name:          "Percentage discount without max cap",
			discountType:  "percentage",
			discountValue: 10.0,
			rentalAmount:  5000.0,
			maxDiscount:   0.0,
			expected:      500.0,
		},
		{
			name:          "Percentage discount capped by maxDiscount",
			discountType:  "percentage",
			discountValue: 20.0,
			rentalAmount:  10000.0,
			maxDiscount:   1000.0,
			expected:      1000.0,
		},
		{
			name:          "Fixed amount discount",
			discountType:  "fixed_amount",
			discountValue: 1500.0,
			rentalAmount:  8000.0,
			maxDiscount:   0.0,
			expected:      1500.0,
		},
		{
			name:          "Fixed amount discount exceeds rental amount",
			discountType:  "fixed_amount",
			discountValue: 10000.0,
			rentalAmount:  4000.0,
			maxDiscount:   0.0,
			expected:      4000.0,
		},
		{
			name:          "Zero rental amount",
			discountType:  "percentage",
			discountValue: 15.0,
			rentalAmount:  0.0,
			maxDiscount:   500.0,
			expected:      0.0,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := CalculateDiscount(tc.discountType, tc.discountValue, tc.rentalAmount, tc.maxDiscount)
			if got != tc.expected {
				t.Errorf("CalculateDiscount(%s, %v, %v, %v) = %v; want %v",
					tc.discountType, tc.discountValue, tc.rentalAmount, tc.maxDiscount, got, tc.expected)
			}
		})
	}
}
