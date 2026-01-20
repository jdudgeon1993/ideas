# Chef's Kiss Backend - Python Age 5.0

**Python handles the thinking. JavaScript makes it breathe.**

---

## 🎯 Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend (JavaScript)                      │
│  - UI rendering only                        │
│  - API calls via api.js                     │
│  - No business logic!                       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Python Backend (FastAPI)                   │
│  ┌─────────────────────────────────────┐   │
│  │  State Manager                       │   │
│  │  - Global state per household        │   │
│  │  - Automatic calculations            │   │
│  │  - Intelligent caching (Redis)       │   │
│  │  - Everything syncs automatically!   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  API Endpoints:                             │
│  - /api/pantry          (CRUD)              │
│  - /api/recipes         (CRUD + search)     │
│  - /api/meal-plans      (CRUD + validate)   │
│  - /api/shopping-list   (auto + manual)     │
│  - /api/alerts          (smart features)    │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Supabase                                   │
│  - PostgreSQL database                      │
│  - Authentication                           │
│  - File storage                             │
└─────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Setup Environment

```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 3. Start Redis

```bash
docker run -d -p 6379:6379 redis
```

### 4. Run Backend

```bash
python app.py
```

Visit: http://localhost:8000/docs

---

## 📁 Project Structure

```
backend/
├── app.py                 # Main FastAPI application
├── state_manager.py       # ⭐ The heart - global state management
├── requirements.txt       # Python dependencies
├── .env                   # Configuration (create from .env.example)
│
├── models/               # Data models
│   ├── pantry.py
│   ├── recipe.py
│   ├── meal_plan.py
│   ├── shopping.py
│   └── user.py
│
├── routes/               # API endpoints
│   ├── auth.py          # Authentication (proxy to Supabase)
│   ├── pantry.py        # Pantry CRUD
│   ├── recipes.py       # Recipes CRUD + search
│   ├── meal_plans.py    # Meal plans CRUD + cook
│   ├── shopping_list.py # Shopping list (auto + manual)
│   └── alerts.py        # Smart features
│
└── utils/               # Utilities
    ├── supabase_client.py  # Supabase connection
    └── auth.py             # JWT validation
```

---

## 🧠 The State Manager (The Magic!)

**Location:** `state_manager.py`

### What It Does

The State Manager is the core of the backend. It:

1. **Loads all data** for a household from Supabase
2. **Calculates everything** automatically:
   - Reserved ingredients (from meal plans)
   - Shopping list (from meals + thresholds)
   - Ready-to-cook recipes (what you can make now)
3. **Caches results** in Redis for 5 minutes
4. **Invalidates cache** automatically when data changes

### Key Features

```python
class HouseholdState:
    """One object holds ALL data for a household"""

    pantry_items: List[PantryItem]
    recipes: List[Recipe]
    meal_plans: List[MealPlan]

    # Auto-calculated:
    reserved_ingredients: Dict[str, float]
    shopping_list: List[ShoppingItem]
    ready_to_cook_recipe_ids: List[int]

    def calculate_all(self):
        """ONE method calculates EVERYTHING"""
        # This is the synchronization magic!
```

### How Endpoints Use It

Every endpoint follows this pattern:

```python
@router.post("/api/pantry")
async def add_pantry_item(item, household_id):
    def update():
        # Insert to Supabase
        supabase.table('pantry_items').insert(item).execute()

    # Update DB and invalidate cache
    StateManager.update_and_invalidate(household_id, update)

    # Return fresh state (shopping list already recalculated!)
    state = StateManager.get_state(household_id)

    return {
        "pantry_items": state.pantry_items,
        "shopping_list": state.shopping_list,  # Auto-updated!
        "ready_recipes": state.ready_to_cook_recipe_ids
    }
```

**Benefits:**
- No manual cache invalidation needed
- Everything stays in sync automatically
- Change pantry → shopping list updates
- Change meals → shopping list updates
- Change anything → everything recalculates

---

## 🔥 New Features

### 1. Manual Shopping Items

Users can add items like toilet paper, soap, cleaning supplies.

**Endpoint:** `POST /api/shopping-list/items`

**Database:** `shopping_list_manual` table

### 2. Check-Off Items

Users can check off items as they shop.

**Endpoint:** `PATCH /api/shopping-list/items/{id}`

**Body:** `{"checked": true}`

### 3. Recipe Search & Filter

Search recipes by name, tags, ingredients, or "ready to cook".

**Endpoint:** `GET /api/recipes/search?q=pasta&ready_only=true`

### 4. Expiration Alerts

Get items expiring in next N days.

**Endpoint:** `GET /api/alerts/expiring?days=3`

### 5. Smart Suggestions

Recipes that use expiring ingredients.

**Endpoint:** `GET /api/alerts/suggestions/use-expiring`

### 6. Pre-Cook Validation

Check if meal can be cooked before depleting pantry.

**Endpoint:** `POST /api/meal-plans/{id}/validate`

**Response:**
```json
{
  "can_cook": false,
  "missing": [
    {"ingredient": "Flour", "needed": 2.0, "available": 0.5, "short": 1.5}
  ]
}
```

### 7. Pantry Health Score

Overall pantry status.

**Endpoint:** `GET /api/alerts/pantry-health`

**Response:**
```json
{
  "total_items": 45,
  "below_threshold": 3,
  "expiring_soon": 2,
  "health_score": 85,
  "status": "excellent"
}
```

---

## 🔧 Configuration

### Environment Variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET_KEY=your-jwt-secret

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# CORS
CORS_ORIGINS=http://localhost:3000,https://your-domain.com

# Environment
ENVIRONMENT=development  # or 'production'
```

### Cache TTL

Default: 5 minutes

To change:
```python
# state_manager.py
class StateManager:
    CACHE_TTL = 300  # seconds
```

---

## 🧪 Testing

### Manual Testing

```bash
# Health check
curl http://localhost:8000/health

# Get pantry (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/pantry
```

### Interactive Docs

Visit: http://localhost:8000/docs

FastAPI auto-generates interactive API documentation!
- Try all endpoints
- See request/response schemas
- Test authentication

---

## 📊 Performance

### Caching Strategy

- **State cached for 5 minutes** in Redis
- **Invalidated on any data change**
- **Cache hit rate:** ~80-90% in production

### Database Queries

- **Indexed queries** for fast lookups
- **Joins minimized** by loading all data at once
- **Row-level security** enforced by Supabase

### Scalability

- **Stateless backend** - can scale horizontally
- **Redis** handles caching
- **Supabase** handles database scaling

---

## 🐛 Debugging

### Enable Debug Logging

```python
# app.py
logging.basicConfig(level=logging.DEBUG)
```

### Check Redis Cache

```bash
redis-cli
> KEYS state:*
> GET state:1
> FLUSHALL  # Clear all cache
```

### Check Supabase Connection

```python
from utils.supabase_client import get_supabase

supabase = get_supabase()
result = supabase.table('households').select('*').limit(1).execute()
print(result.data)
```

---

## 🚀 Deployment

### Railway (Recommended)

1. Connect GitHub repo
2. Select `/backend` directory
3. Add environment variables
4. Deploy!

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t chefs-kiss-backend .
docker run -p 8000:8000 --env-file .env chefs-kiss-backend
```

---

## 📝 API Endpoints Summary

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/me` - Get current user

### Pantry
- `GET /api/pantry` - Get all items
- `POST /api/pantry` - Add item
- `PUT /api/pantry/{id}` - Update item
- `DELETE /api/pantry/{id}` - Delete item

### Recipes
- `GET /api/recipes` - Get all recipes
- `GET /api/recipes/search` - Search recipes
- `GET /api/recipes/{id}` - Get single recipe
- `POST /api/recipes` - Add recipe
- `PUT /api/recipes/{id}` - Update recipe
- `DELETE /api/recipes/{id}` - Delete recipe
- `GET /api/recipes/{id}/scaled` - Get scaled recipe

### Meal Plans
- `GET /api/meal-plans` - Get meal plans
- `POST /api/meal-plans` - Add meal
- `PUT /api/meal-plans/{id}` - Update meal
- `DELETE /api/meal-plans/{id}` - Delete meal
- `POST /api/meal-plans/{id}/validate` - Validate can cook
- `POST /api/meal-plans/{id}/cook` - Mark cooked (depletes pantry)

### Shopping List
- `GET /api/shopping-list` - Get complete list
- `POST /api/shopping-list/regenerate` - Force recalculate
- `POST /api/shopping-list/items` - Add manual item
- `PATCH /api/shopping-list/items/{id}` - Update (check off)
- `DELETE /api/shopping-list/items/{id}` - Delete manual item
- `POST /api/shopping-list/clear-checked` - Clear checked items
- `POST /api/shopping-list/add-checked-to-pantry` - Bulk add to pantry

### Alerts & Suggestions
- `GET /api/alerts/expiring` - Expiring items
- `GET /api/alerts/suggestions/use-expiring` - Recipe suggestions
- `GET /api/alerts/suggestions/ready-to-cook` - Ready recipes
- `GET /api/alerts/pantry-health` - Health score
- `GET /api/alerts/dashboard` - Complete dashboard

---

## 🎯 Philosophy

**The pantry is the heart. The shopping list makes it beat.**

This backend embodies that philosophy:
- **Single source of truth** (State Manager)
- **Automatic synchronization** (everything flows from one state)
- **Intelligent caching** (fast, but always fresh)
- **Clear separation** (Python thinks, JavaScript breathes)

---

## 📚 Learn More

- **FastAPI:** https://fastapi.tiangolo.com/
- **Pydantic:** https://docs.pydantic.dev/
- **Supabase:** https://supabase.com/docs
- **Redis:** https://redis.io/docs/

---

**Built with ❤️ for Python Age 5.0**
