package pagination

import (
	"net/http"
	"strconv"
)

type Params struct {
	Page    int    `json:"page"`
	Limit   int    `json:"limit"`
	Offset  int    `json:"offset"`
	SortBy  string `json:"sort_by"`
	SortDir string `json:"sort_dir"`
	Search  string `json:"search"`
}

type Meta struct {
	CurrentPage  int   `json:"current_page"`
	PerPage      int   `json:"per_page"`
	TotalItems   int64 `json:"total_items"`
	TotalPages   int   `json:"total_pages"`
	HasNextPage  bool  `json:"has_next_page"`
	HasPrevPage  bool  `json:"has_prev_page"`
}

func FromRequest(r *http.Request) Params {
	q := r.URL.Query()

	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	sortBy := q.Get("sort_by")
	if sortBy == "" {
		sortBy = "created_at"
	}

	sortDir := q.Get("sort_dir")
	if sortDir != "asc" && sortDir != "desc" {
		sortDir = "desc"
	}

	search := q.Get("search")

	return Params{
		Page:    page,
		Limit:   limit,
		Offset:  offset,
		SortBy:  sortBy,
		SortDir: sortDir,
		Search:  search,
	}
}

func BuildMeta(total int64, p Params) Meta {
	totalPages := 0
	if p.Limit > 0 {
		totalPages = int((total + int64(p.Limit) - 1) / int64(p.Limit))
	}

	return Meta{
		CurrentPage:  p.Page,
		PerPage:      p.Limit,
		TotalItems:   total,
		TotalPages:   totalPages,
		HasNextPage:  p.Page < totalPages,
		HasPrevPage:  p.Page > 1,
	}
}
