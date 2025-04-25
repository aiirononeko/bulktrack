package http

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
)

// responseWriter is a wrapper for http.ResponseWriter that captures the status code
type responseWriter struct {
	http.ResponseWriter
	status int
}

// WriteHeader captures the status code and calls the underlying ResponseWriter's WriteHeader
func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}

// Status returns the captured status code
func (rw *responseWriter) Status() int {
	if rw.status == 0 {
		return http.StatusOK
	}
	return rw.status
}

// ErrorCode represents a standardized error code
type ErrorCode string

// Common error codes
const (
	ErrorUnauthorized       ErrorCode = "ERROR.UNAUTHORIZED"
	ErrorForbidden          ErrorCode = "ERROR.FORBIDDEN"
	ErrorNotFound           ErrorCode = "ERROR.NOT_FOUND"
	ErrorValidationError    ErrorCode = "ERROR.VALIDATION_ERROR"
	ErrorDuplicateName      ErrorCode = "ERROR.DUPLICATE_NAME"
	ErrorItemsTooMany       ErrorCode = "ERROR.ITEMS_TOO_MANY"
	ErrorExerciseNotFound   ErrorCode = "ERROR.EXERCISE_NOT_FOUND"
	ErrorVersionMismatch    ErrorCode = "ERROR.VERSION_MISMATCH"
	ErrorInvalidLimit       ErrorCode = "ERROR.INVALID_LIMIT"
	ErrorInternalServer     ErrorCode = "ERROR.INTERNAL_SERVER"
	ErrorPreconditionFailed ErrorCode = "ERROR.PRECONDITION_FAILED"
)

// ValidationDetail represents a single validation error detail
type ValidationDetail struct {
	Field  string `json:"field"`
	Reason string `json:"reason"`
}

// ErrorResponse represents a standardized error response
type ErrorResponse struct {
	Error struct {
		Code    ErrorCode          `json:"code"`
		Message string             `json:"message"`
		Details []ValidationDetail `json:"details,omitempty"`
	} `json:"error"`
}

// AppError represents an application error with standardized fields
type AppError struct {
	Code    ErrorCode
	Message string
	Details []ValidationDetail
	Err     error
	Status  int
}

// Error implements the error interface
func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

// Unwrap returns the wrapped error
func (e *AppError) Unwrap() error {
	return e.Err
}

// NewAppError creates a new AppError
func NewAppError(code ErrorCode, message string, status int, err error) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
		Err:     err,
		Status:  status,
	}
}

// WithDetails adds validation details to an AppError
func (e *AppError) WithDetails(details []ValidationDetail) *AppError {
	e.Details = details
	return e
}

// NewValidationError creates a new validation error
func NewValidationError(message string, details []ValidationDetail) *AppError {
	return &AppError{
		Code:    ErrorValidationError,
		Message: message,
		Details: details,
		Status:  http.StatusBadRequest,
	}
}

// NewNotFoundError creates a new not found error
func NewNotFoundError(message string, err error) *AppError {
	return &AppError{
		Code:    ErrorNotFound,
		Message: message,
		Err:     err,
		Status:  http.StatusNotFound,
	}
}

// NewUnauthorizedError creates a new unauthorized error
func NewUnauthorizedError(message string, err error) *AppError {
	return &AppError{
		Code:    ErrorUnauthorized,
		Message: message,
		Err:     err,
		Status:  http.StatusUnauthorized,
	}
}

// NewForbiddenError creates a new forbidden error
func NewForbiddenError(message string, err error) *AppError {
	return &AppError{
		Code:    ErrorForbidden,
		Message: message,
		Err:     err,
		Status:  http.StatusForbidden,
	}
}

// NewDuplicateNameError creates a new duplicate name error
func NewDuplicateNameError(message string, err error) *AppError {
	return &AppError{
		Code:    ErrorDuplicateName,
		Message: message,
		Err:     err,
		Status:  http.StatusConflict,
	}
}

// NewVersionMismatchError creates a new version mismatch error
func NewVersionMismatchError(message string, err error) *AppError {
	return &AppError{
		Code:    ErrorVersionMismatch,
		Message: message,
		Err:     err,
		Status:  http.StatusPreconditionFailed,
	}
}

// NewInvalidLimitError creates a new invalid limit error
func NewInvalidLimitError(message string, err error) *AppError {
	return &AppError{
		Code:    ErrorInvalidLimit,
		Message: message,
		Err:     err,
		Status:  http.StatusBadRequest,
	}
}

// NewItemsTooManyError creates a new items too many error
func NewItemsTooManyError(message string, err error) *AppError {
	return &AppError{
		Code:    ErrorItemsTooMany,
		Message: message,
		Err:     err,
		Status:  http.StatusBadRequest,
	}
}

// NewExerciseNotFoundError creates a new exercise not found error
func NewExerciseNotFoundError(message string, err error) *AppError {
	return &AppError{
		Code:    ErrorExerciseNotFound,
		Message: message,
		Err:     err,
		Status:  http.StatusNotFound,
	}
}

// NewInternalServerError creates a new internal server error
func NewInternalServerError(message string, err error) *AppError {
	return &AppError{
		Code:    ErrorInternalServer,
		Message: message,
		Err:     err,
		Status:  http.StatusInternalServerError,
	}
}

// ErrorHandler is a middleware that handles errors
func ErrorHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Create a response recorder to capture the response
		ww := &responseWriter{ResponseWriter: w, status: 0}

		// Call the next handler
		next.ServeHTTP(ww, r)

		// If the status code is >= 400, we assume an error occurred
		if ww.Status() >= 400 {
			// The error has already been handled, so we don't need to do anything
			return
		}
	})
}

// WriteError writes an error response to the http.ResponseWriter
func WriteError(w http.ResponseWriter, err error) {
	var appErr *AppError
	if !errors.As(err, &appErr) {
		// If it's not an AppError, wrap it as an internal server error
		appErr = NewInternalServerError("An unexpected error occurred", err)
	}

	// Create the error response
	resp := ErrorResponse{}
	resp.Error.Code = appErr.Code
	resp.Error.Message = appErr.Message
	resp.Error.Details = appErr.Details

	// Set the content type and status code
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(appErr.Status)

	// Write the response
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		// If we can't encode the error response, log it and send a simple error
		http.Error(w, "Error encoding error response", http.StatusInternalServerError)
	}
}

// IsAppError checks if an error is an AppError
func IsAppError(err error) bool {
	var appErr *AppError
	return errors.As(err, &appErr)
}

// GetAppError extracts an AppError from an error
func GetAppError(err error) (*AppError, bool) {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr, true
	}
	return nil, false
}

// IsNotFoundError checks if an error is a not found error
func IsNotFoundError(err error) bool {
	appErr, ok := GetAppError(err)
	return ok && appErr.Code == ErrorNotFound
}

// IsDuplicateNameError checks if an error is a duplicate name error
func IsDuplicateNameError(err error) bool {
	appErr, ok := GetAppError(err)
	return ok && appErr.Code == ErrorDuplicateName
}

// IsValidationError checks if an error is a validation error
func IsValidationError(err error) bool {
	appErr, ok := GetAppError(err)
	return ok && appErr.Code == ErrorValidationError
}

// IsVersionMismatchError checks if an error is a version mismatch error
func IsVersionMismatchError(err error) bool {
	appErr, ok := GetAppError(err)
	return ok && appErr.Code == ErrorVersionMismatch
}

// HandleIfMatch handles the If-Match header for optimistic locking
func HandleIfMatch(r *http.Request, currentVersion string) error {
	ifMatch := r.Header.Get("If-Match")
	if ifMatch == "" {
		return NewAppError(
			ErrorPreconditionFailed,
			"Precondition Required: If-Match header is required",
			http.StatusPreconditionRequired,
			nil,
		)
	}

	// Remove the weak validator prefix if present
	ifMatch = strings.TrimPrefix(ifMatch, "W/")
	currentVersion = strings.TrimPrefix(currentVersion, "W/")

	// Remove quotes if present
	ifMatch = strings.Trim(ifMatch, "\"")
	currentVersion = strings.Trim(currentVersion, "\"")

	if ifMatch != currentVersion {
		return NewVersionMismatchError(
			fmt.Sprintf("Version mismatch: expected %s, got %s", currentVersion, ifMatch),
			nil,
		)
	}

	return nil
}
