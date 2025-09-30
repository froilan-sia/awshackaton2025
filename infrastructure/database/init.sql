-- Hong Kong Tourism AI Platform Database Initialization
-- This script sets up the basic database structure for production

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS locations;
CREATE SCHEMA IF NOT EXISTS events;
CREATE SCHEMA IF NOT EXISTS recommendations;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS content;

-- Set timezone
SET timezone = 'Asia/Hong_Kong';

-- Create basic tables (these will be managed by migrations in production)

-- Users schema tables
CREATE TABLE IF NOT EXISTS users.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'Asia/Hong_Kong',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS users.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users.users(id) ON DELETE CASCADE,
    interests TEXT[],
    budget_range VARCHAR(20),
    group_type VARCHAR(20),
    dietary_restrictions TEXT[],
    accessibility_needs TEXT[],
    activity_level VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locations schema tables
CREATE TABLE IF NOT EXISTS locations.attractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location GEOGRAPHY(POINT, 4326),
    address TEXT,
    district VARCHAR(100),
    categories TEXT[],
    opening_hours JSONB,
    contact_info JSONB,
    website VARCHAR(255),
    rating DECIMAL(3,2),
    price_range VARCHAR(20),
    accessibility_features TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS locations.geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    radius INTEGER NOT NULL, -- in meters
    trigger_type VARCHAR(50),
    content_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events schema tables
CREATE TABLE IF NOT EXISTS events.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location GEOGRAPHY(POINT, 4326),
    venue_name VARCHAR(255),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    event_type VARCHAR(50),
    source VARCHAR(50), -- HKTB, MALL, COMMUNITY
    source_id VARCHAR(255),
    categories TEXT[],
    target_audience TEXT[],
    price_info JSONB,
    booking_url VARCHAR(255),
    weather_dependent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recommendations schema tables
CREATE TABLE IF NOT EXISTS recommendations.user_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users.users(id) ON DELETE CASCADE,
    item_id UUID,
    item_type VARCHAR(50), -- attraction, event, restaurant
    interaction_type VARCHAR(50), -- view, like, visit, share
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    context JSONB, -- weather, time, location, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendations.recommendation_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users.users(id) ON DELETE CASCADE,
    cache_key VARCHAR(255) NOT NULL,
    recommendations JSONB NOT NULL,
    context JSONB,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics schema tables
CREATE TABLE IF NOT EXISTS analytics.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users.users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    device_info JSONB,
    location_data JSONB,
    pages_visited INTEGER DEFAULT 0,
    actions_taken INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS analytics.crowd_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID,
    location_name VARCHAR(255),
    location GEOGRAPHY(POINT, 4326),
    crowd_level INTEGER CHECK (crowd_level >= 0 AND crowd_level <= 100),
    wait_time INTEGER, -- in minutes
    data_source VARCHAR(50),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content schema tables
CREATE TABLE IF NOT EXISTS content.local_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    insight_type VARCHAR(50), -- tip, warning, recommendation, cultural_note
    author_type VARCHAR(20), -- local_resident, tourist, expert
    author_id UUID,
    authenticity_score DECIMAL(3,2),
    language VARCHAR(10) DEFAULT 'en',
    tags TEXT[],
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content.practical_tips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID,
    category VARCHAR(50), -- safety, etiquette, preparation, weather
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    conditions TEXT[], -- when this tip applies
    priority INTEGER DEFAULT 1,
    language VARCHAR(10) DEFAULT 'en',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users.users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users.users(created_at);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON users.user_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_attractions_location ON locations.attractions USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_attractions_categories ON locations.attractions USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_attractions_district ON locations.attractions(district);

CREATE INDEX IF NOT EXISTS idx_geofences_location ON locations.geofences USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_geofences_active ON locations.geofences(is_active);

CREATE INDEX IF NOT EXISTS idx_events_start_time ON events.events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_location ON events.events USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_events_categories ON events.events USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_events_source ON events.events(source);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON recommendations.user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_item ON recommendations.user_interactions(item_id, item_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON recommendations.user_interactions(created_at);

CREATE INDEX IF NOT EXISTS idx_recommendation_cache_user_id ON recommendations.recommendation_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_key ON recommendations.recommendation_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_expires ON recommendations.recommendation_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON analytics.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_start_time ON analytics.user_sessions(start_time);

CREATE INDEX IF NOT EXISTS idx_crowd_data_location ON analytics.crowd_data USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_crowd_data_recorded_at ON analytics.crowd_data(recorded_at);
CREATE INDEX IF NOT EXISTS idx_crowd_data_location_id ON analytics.crowd_data(location_id);

CREATE INDEX IF NOT EXISTS idx_local_insights_location_id ON content.local_insights(location_id);
CREATE INDEX IF NOT EXISTS idx_local_insights_type ON content.local_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_local_insights_language ON content.local_insights(language);
CREATE INDEX IF NOT EXISTS idx_local_insights_verified ON content.local_insights(is_verified);

CREATE INDEX IF NOT EXISTS idx_practical_tips_location_id ON content.practical_tips(location_id);
CREATE INDEX IF NOT EXISTS idx_practical_tips_category ON content.practical_tips(category);
CREATE INDEX IF NOT EXISTS idx_practical_tips_language ON content.practical_tips(language);
CREATE INDEX IF NOT EXISTS idx_practical_tips_active ON content.practical_tips(is_active);

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON users.user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attractions_updated_at BEFORE UPDATE ON locations.attractions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events.events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_local_insights_updated_at BEFORE UPDATE ON content.local_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_practical_tips_updated_at BEFORE UPDATE ON content.practical_tips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO locations.attractions (name, description, location, address, district, categories, rating, price_range) VALUES
('Victoria Peak', 'Iconic mountain peak offering panoramic views of Hong Kong', ST_GeogFromText('POINT(114.1494 22.2711)'), 'The Peak, Hong Kong', 'Central and Western', ARRAY['viewpoint', 'tourist_attraction', 'nature'], 4.5, 'moderate'),
('Star Ferry Pier', 'Historic ferry terminal connecting Hong Kong Island and Kowloon', ST_GeogFromText('POINT(114.1694 22.2944)'), 'Central Pier, Hong Kong', 'Central and Western', ARRAY['transportation', 'historic', 'waterfront'], 4.2, 'budget'),
('Temple Street Night Market', 'Famous night market with street food and shopping', ST_GeogFromText('POINT(114.1719 22.3111)'), 'Temple Street, Yau Ma Tei, Kowloon', 'Yau Tsim Mong', ARRAY['market', 'food', 'shopping', 'nightlife'], 4.3, 'budget');

INSERT INTO events.events (title, description, location, venue_name, start_time, end_time, event_type, source, categories) VALUES
('Hong Kong Arts Festival', 'Annual international arts festival featuring performances from around the world', ST_GeogFromText('POINT(114.1694 22.2944)'), 'Hong Kong Cultural Centre', '2024-02-15 19:00:00+08', '2024-03-15 22:00:00+08', 'festival', 'HKTB', ARRAY['arts', 'culture', 'music']),
('IFC Mall Chinese New Year Celebration', 'Special Chinese New Year activities and decorations', ST_GeogFromText('POINT(114.1583 22.2856)'), 'IFC Mall', '2024-02-10 10:00:00+08', '2024-02-24 22:00:00+08', 'celebration', 'MALL', ARRAY['festival', 'family', 'shopping']);

INSERT INTO content.local_insights (location_id, title, content, insight_type, author_type, authenticity_score, language) VALUES
((SELECT id FROM locations.attractions WHERE name = 'Victoria Peak'), 'Best Time to Visit Peak', 'Locals recommend visiting Victoria Peak early morning (7-9 AM) or late evening after 8 PM to avoid crowds. The sunset view is spectacular but very crowded. For the best photos without tourists, go on weekday mornings.', 'tip', 'local_resident', 4.8, 'en'),
((SELECT id FROM locations.attractions WHERE name = 'Temple Street Night Market'), 'Authentic Street Food Guide', 'Skip the touristy stalls at the entrance. The best local food is in the middle section - try the curry fish balls from the cart with the longest queue of locals. Always ask for prices first and don''t be afraid to walk away if it seems too expensive.', 'recommendation', 'local_resident', 4.9, 'en');

INSERT INTO content.practical_tips (category, title, content, conditions, priority, language) VALUES
('weather', 'Rainy Season Preparation', 'Hong Kong''s rainy season (May-September) can bring sudden heavy downpours. Always carry a compact umbrella and wear non-slip shoes. Many MTR stations and malls are connected underground - use these covered walkways during heavy rain.', ARRAY['rainy_weather', 'summer'], 1, 'en'),
('etiquette', 'MTR Etiquette', 'Stand on the right side of escalators, let passengers exit before boarding, offer priority seats to elderly and pregnant women, and keep your voice down. Eating and drinking (except water) is prohibited on MTR trains.', ARRAY['public_transport'], 1, 'en'),
('safety', 'Night Market Safety', 'Temple Street and other night markets are generally safe, but keep valuables secure and be aware of pickpockets in crowded areas. Stick to well-lit areas and trust your instincts if something feels off.', ARRAY['night_time', 'crowded_areas'], 2, 'en');

-- Grant permissions (adjust as needed for your application users)
-- GRANT USAGE ON SCHEMA users, locations, events, recommendations, analytics, content TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA users, locations, events, recommendations, analytics, content TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA users, locations, events, recommendations, analytics, content TO app_user;

-- Create a view for popular attractions
CREATE OR REPLACE VIEW locations.popular_attractions AS
SELECT 
    a.*,
    COUNT(ui.id) as interaction_count,
    AVG(ui.rating) as avg_user_rating
FROM locations.attractions a
LEFT JOIN recommendations.user_interactions ui ON a.id = ui.item_id AND ui.item_type = 'attraction'
GROUP BY a.id
ORDER BY interaction_count DESC, a.rating DESC;

-- Create a view for current events
CREATE OR REPLACE VIEW events.current_events AS
SELECT *
FROM events.events
WHERE start_time <= NOW() + INTERVAL '7 days'
  AND end_time >= NOW()
ORDER BY start_time;

COMMIT;