# Chef's Kiss Database Schema

*Last updated: 2026-01-28*

## Tables

### households
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| name | text | NOT NULL | |
| created_at | timestamp with time zone | NULL | now() |
| updated_at | timestamp with time zone | NULL | now() |
| created_by | uuid | NULL | |

### household_members
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| household_id | uuid | NULL | |
| user_id | uuid | NULL | |
| role | text | NULL | 'member' |
| created_at | timestamp with time zone | NULL | now() |

### household_invites
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| household_id | uuid | NULL | |
| code | text | NOT NULL | |
| expires_at | timestamp with time zone | NOT NULL | |
| created_at | timestamp with time zone | NULL | now() |
| created_by | uuid | NULL | |
| used_at | timestamp with time zone | NULL | |
| used_by | uuid | NULL | |
| role | text | NULL | 'member' |

### household_settings
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| household_id | uuid | NOT NULL | |
| locations | jsonb | NULL | '["Pantry", "Refrigerator", "Freezer", "Cabinet", "Counter"]' |
| categories | jsonb | NULL | '["Meat", "Dairy", "Produce", "Pantry", "Frozen", "Spices", "Beverages", "Snacks", "Other"]' |
| category_emojis | jsonb | NULL | '{}' |
| created_at | timestamp with time zone | NULL | now() |
| updated_at | timestamp with time zone | NULL | now() |

### pantry_items
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| household_id | uuid | NULL | |
| created_by | uuid | NULL | |
| name | text | NOT NULL | |
| category | text | NULL | 'pantry' |
| quantity | numeric | NULL | 1 |
| unit | text | NULL | '' |
| expiration_date | date | NULL | |
| notes | text | NULL | |
| created_at | timestamp with time zone | NULL | now() |
| updated_at | timestamp with time zone | NULL | now() |
| item_category | text | NULL | |
| reserved_quantity | numeric | NULL | 0 |
| min_threshold | numeric | NULL | 0 |

### pantry_locations
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | uuid_generate_v4() |
| pantry_item_id | uuid | NOT NULL | |
| location_name | text | NOT NULL | |
| quantity | numeric | NOT NULL | 0 |
| expiration_date | date | NULL | |
| created_at | timestamp with time zone | NULL | now() |
| updated_at | timestamp with time zone | NULL | now() |

### recipes
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| household_id | uuid | NULL | |
| created_by | uuid | NULL | |
| name | text | NOT NULL | |
| servings | integer | NULL | 4 |
| category | text | NULL | |
| image_url | text | NULL | |
| instructions | text | NULL | |
| ingredients | jsonb | NULL | '[]' |
| favorite | boolean | NULL | false |

### meal_plans
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| household_id | uuid | NULL | |
| week | text | NULL | |
| day_of_week | text | NULL | |
| recipe_ids | jsonb | NULL | '[]' |
| planned_date | date | NULL | |
| created_at | timestamp with time zone | NULL | now() |
| updated_at | timestamp with time zone | NULL | now() |
| meal_type | text | NULL | |
| is_cooked | boolean | NULL | false |
| recipe_id | uuid | NULL | |

### shopping_list_manual
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigserial | NOT NULL | |
| household_id | uuid | NOT NULL | |
| name | text | NOT NULL | |
| quantity | numeric | NULL | 1 |
| unit | text | NULL | |
| category | text | NULL | 'Other' |
| checked | boolean | NULL | false |
| created_at | timestamp with time zone | NULL | now() |

### categories
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| household_id | uuid | NOT NULL | |
| name | text | NOT NULL | |
| is_default | boolean | NULL | false |
| created_at | timestamp with time zone | NULL | now() |
| updated_at | timestamp with time zone | NULL | now() |
| emoji | text | NULL | |

### locations
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| household_id | uuid | NOT NULL | |
| name | text | NOT NULL | |
| is_default | boolean | NULL | false |
| created_at | timestamp with time zone | NULL | now() |
| updated_at | timestamp with time zone | NULL | now() |

### recent_purchases
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| household_id | uuid | NOT NULL | |
| item_name | text | NOT NULL | |
| item_category | text | NULL | |
| quantity | numeric | NULL | |
| unit | text | NULL | |
| purchased_at | timestamp with time zone | NULL | now() |
| created_by | uuid | NULL | |

### bulk_entry_drafts
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | uuid_generate_v4() |
| household_id | uuid | NOT NULL | |
| row_number | integer | NOT NULL | |
| item_name | text | NULL | |
| quantity | numeric | NULL | |
| unit | text | NULL | |
| category | text | NULL | |
| location | text | NULL | |
| created_by | uuid | NULL | |
| created_at | timestamp with time zone | NULL | now() |
| updated_at | timestamp with time zone | NULL | now() |

## Foreign Key Relationships

| Table | Column | References |
|-------|--------|------------|
| household_members | household_id | households.id |
| household_members | user_id | auth.users.id |
| household_invites | household_id | households.id |
| household_settings | household_id | households.id |
| pantry_items | household_id | households.id |
| pantry_locations | pantry_item_id | pantry_items.id |
| recipes | household_id | households.id |
| meal_plans | household_id | households.id |
| meal_plans | recipe_id | recipes.id |
| shopping_list_manual | household_id | households.id |
| categories | household_id | households.id |
| locations | household_id | households.id |
| recent_purchases | household_id | households.id |
| bulk_entry_drafts | household_id | households.id |

---

*This file can be auto-updated by `.github/workflows/schema-dump.yml`*
*To trigger manually: Go to Actions > Dump Supabase Schema > Run workflow*
