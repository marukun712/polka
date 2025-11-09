package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
)

// Record holds the schema definition for the Record entity.
type Record struct {
	ent.Schema
}

// Fields of the Record.
func (Record) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").Unique().NotEmpty().Immutable(),
		field.String("content").Unique().NotEmpty().Immutable(),
		field.String("sig").Unique().NotEmpty().Immutable(),
		field.String("pk").Unique().NotEmpty().Immutable(),
	}
}

// Edges of the Record.
func (Record) Edges() []ent.Edge {
	return nil
}
