package validation

import (
	"context"
	"reflect"
	"regexp"
	"strings"
	"unicode/utf8"

	httpError "github.com/aiirononeko/bulktrack/apps/api/internal/http"
	"github.com/google/uuid"
)

// Validator provides validation functionality
type Validator struct{}

// ValidationRule represents a validation rule
type ValidationRule struct {
	Field     string
	Rule      string
	Message   string
	Validator func(value interface{}) bool
}

// ValidationResult represents the result of validation
type ValidationResult struct {
	Valid   bool
	Details []httpError.ValidationDetail
}

// New creates a new Validator
func New() *Validator {
	return &Validator{}
}

// Validate validates a struct against a set of rules
func (v *Validator) Validate(ctx context.Context, data interface{}, rules []ValidationRule) ValidationResult {
	result := ValidationResult{
		Valid:   true,
		Details: []httpError.ValidationDetail{},
	}

	val := reflect.ValueOf(data)
	if val.Kind() == reflect.Ptr {
		val = val.Elem()
	}

	if val.Kind() != reflect.Struct {
		panic("data must be a struct or a pointer to a struct")
	}

	for _, rule := range rules {
		fieldPath := strings.Split(rule.Field, ".")
		fieldValue, found := v.getFieldValue(val, fieldPath)

		if !found {
			// Field not found, skip validation
			continue
		}

		if !rule.Validator(fieldValue.Interface()) {
			result.Valid = false
			result.Details = append(result.Details, httpError.ValidationDetail{
				Field:  rule.Field,
				Reason: rule.Rule,
			})
		}
	}

	return result
}

// getFieldValue gets the value of a field by path
func (v *Validator) getFieldValue(val reflect.Value, fieldPath []string) (reflect.Value, bool) {
	current := val

	for _, field := range fieldPath {
		if current.Kind() == reflect.Ptr {
			if current.IsNil() {
				return reflect.Value{}, false
			}
			current = current.Elem()
		}

		if current.Kind() != reflect.Struct {
			return reflect.Value{}, false
		}

		current = current.FieldByName(field)
		if !current.IsValid() {
			return reflect.Value{}, false
		}
	}

	return current, true
}

// Common validation rules

// Required checks if a value is not empty
func Required(value interface{}) bool {
	if value == nil {
		return false
	}

	v := reflect.ValueOf(value)
	switch v.Kind() {
	case reflect.String:
		return v.String() != ""
	case reflect.Slice, reflect.Map, reflect.Array:
		return v.Len() > 0
	case reflect.Ptr:
		return !v.IsNil()
	default:
		return true
	}
}

// MaxLength checks if a string's length is less than or equal to max
func MaxLength(max int) func(interface{}) bool {
	return func(value interface{}) bool {
		if value == nil {
			return true
		}

		v := reflect.ValueOf(value)
		if v.Kind() != reflect.String {
			return false
		}

		return utf8.RuneCountInString(v.String()) <= max
	}
}

// MinLength checks if a string's length is greater than or equal to min
func MinLength(min int) func(interface{}) bool {
	return func(value interface{}) bool {
		if value == nil {
			return min == 0
		}

		v := reflect.ValueOf(value)
		if v.Kind() != reflect.String {
			return false
		}

		return utf8.RuneCountInString(v.String()) >= min
	}
}

// MaxItems checks if a slice's length is less than or equal to max
func MaxItems(max int) func(interface{}) bool {
	return func(value interface{}) bool {
		if value == nil {
			return true
		}

		v := reflect.ValueOf(value)
		if v.Kind() != reflect.Slice && v.Kind() != reflect.Array {
			return false
		}

		return v.Len() <= max
	}
}

// MinItems checks if a slice's length is greater than or equal to min
func MinItems(min int) func(interface{}) bool {
	return func(value interface{}) bool {
		if value == nil {
			return min == 0
		}

		v := reflect.ValueOf(value)
		if v.Kind() != reflect.Slice && v.Kind() != reflect.Array {
			return false
		}

		return v.Len() >= min
	}
}

// Range checks if a number is within a range
func Range(min, max int) func(interface{}) bool {
	return func(value interface{}) bool {
		if value == nil {
			return false
		}

		v := reflect.ValueOf(value)
		switch v.Kind() {
		case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
			return v.Int() >= int64(min) && v.Int() <= int64(max)
		case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
			return v.Uint() >= uint64(min) && v.Uint() <= uint64(max)
		case reflect.Float32, reflect.Float64:
			return v.Float() >= float64(min) && v.Float() <= float64(max)
		default:
			return false
		}
	}
}

// Pattern checks if a string matches a regex pattern
func Pattern(pattern string) func(interface{}) bool {
	re := regexp.MustCompile(pattern)
	return func(value interface{}) bool {
		if value == nil {
			return false
		}

		v := reflect.ValueOf(value)
		if v.Kind() != reflect.String {
			return false
		}

		return re.MatchString(v.String())
	}
}

// IsUUID checks if a string is a valid UUID
func IsUUID(value interface{}) bool {
	if value == nil {
		return false
	}

	v := reflect.ValueOf(value)
	if v.Kind() != reflect.String {
		return false
	}

	_, err := uuid.Parse(v.String())
	return err == nil
}

// ValidateMenu validates a menu creation/update request
func (v *Validator) ValidateMenu(ctx context.Context, name string, items []interface{}) ValidationResult {
	rules := []ValidationRule{
		{
			Field:     "name",
			Rule:      "REQUIRED",
			Message:   "Menu name is required",
			Validator: Required,
		},
		{
			Field:     "name",
			Rule:      "MAX_LENGTH",
			Message:   "Menu name must be at most 50 characters",
			Validator: MaxLength(50),
		},
		{
			Field:     "items",
			Rule:      "REQUIRED",
			Message:   "Menu items are required",
			Validator: Required,
		},
		{
			Field:     "items",
			Rule:      "MAX_ITEMS",
			Message:   "Menu can have at most 100 items",
			Validator: MaxItems(100),
		},
		{
			Field:     "items",
			Rule:      "MIN_ITEMS",
			Message:   "Menu must have at least 1 item",
			Validator: MinItems(1),
		},
	}

	data := struct {
		Name  string
		Items []interface{}
	}{
		Name:  name,
		Items: items,
	}

	return v.Validate(ctx, data, rules)
}

// ValidateMenuItem validates a menu item
func (v *Validator) ValidateMenuItem(ctx context.Context, exerciseID uuid.UUID, setOrder int32, plannedSets, plannedReps, plannedIntervalSeconds *int32) ValidationResult {
	rules := []ValidationRule{
		{
			Field:     "exerciseID",
			Rule:      "REQUIRED",
			Message:   "Exercise ID is required",
			Validator: Required,
		},
		{
			Field:     "setOrder",
			Rule:      "RANGE",
			Message:   "Set order must be between 1 and 100",
			Validator: Range(1, 100),
		},
	}

	// Add validation for optional fields if they are provided
	if plannedSets != nil {
		rules = append(rules, ValidationRule{
			Field:     "plannedSets",
			Rule:      "RANGE",
			Message:   "Planned sets must be between 1 and 999",
			Validator: Range(1, 999),
		})
	}

	if plannedReps != nil {
		rules = append(rules, ValidationRule{
			Field:     "plannedReps",
			Rule:      "RANGE",
			Message:   "Planned reps must be between 1 and 999",
			Validator: Range(1, 999),
		})
	}

	if plannedIntervalSeconds != nil {
		rules = append(rules, ValidationRule{
			Field:     "plannedIntervalSeconds",
			Rule:      "RANGE",
			Message:   "Planned interval seconds must be between 1 and 999",
			Validator: Range(1, 999),
		})
	}

	data := struct {
		ExerciseID             uuid.UUID
		SetOrder               int32
		PlannedSets            *int32
		PlannedReps            *int32
		PlannedIntervalSeconds *int32
	}{
		ExerciseID:             exerciseID,
		SetOrder:               setOrder,
		PlannedSets:            plannedSets,
		PlannedReps:            plannedReps,
		PlannedIntervalSeconds: plannedIntervalSeconds,
	}

	return v.Validate(ctx, data, rules)
}

// ValidatePagination validates pagination parameters
func (v *Validator) ValidatePagination(ctx context.Context, limit int) ValidationResult {
	rules := []ValidationRule{
		{
			Field:     "limit",
			Rule:      "RANGE",
			Message:   "Limit must be between 1 and 100",
			Validator: Range(1, 100),
		},
	}

	data := struct {
		Limit int
	}{
		Limit: limit,
	}

	return v.Validate(ctx, data, rules)
}
