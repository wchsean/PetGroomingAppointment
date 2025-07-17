-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS grooming;

-- Create customers table
CREATE TABLE IF NOT EXISTS grooming.customers (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(255),
  customer_note TEXT,
  customer_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grooming.customer_phones (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES grooming.customers(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL, -- 建議加上 NOT NULL
    phone_type VARCHAR(50),      -- 可選：電話類型 (手機, 住家, 工作)
    is_primary BOOLEAN DEFAULT FALSE, -- 可選：是否為主要電話
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP  
);


-- Create dog table
CREATE TABLE IF NOT EXISTS grooming.dogs (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES grooming.customers(id) ON DELETE CASCADE,
  dog_name VARCHAR(255) NOT NULL,
  dog_breed VARCHAR(255),
  dog_note TEXT,
  dog_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create service_history table
CREATE TABLE IF NOT EXISTS grooming.service_history (
  id SERIAL PRIMARY KEY,
  dog_id INTEGER REFERENCES grooming.dogs(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  service TEXT NOT NULL,
  service_price NUMERIC(10, 2),
  service_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS grooming.appointments (
  id SERIAL PRIMARY KEY,
  appointment_customer_name VARCHAR(255),
  appointment_dog_name VARCHAR(255),
  dog_id INTEGER REFERENCES grooming.dogs(id) ON DELETE SET NULL,
  appointment_dog_breed VARCHAR(255),
  appointment_phone VARCHAR(20),
  appointment_date DATE NOT NULL,
  appointment_time VARCHAR(10) NOT NULL,
  appointment_active BOOLEAN DEFAULT TRUE,
  today_services TEXT,
  today_price NUMERIC(10, 2),
  today_note TEXT,
  customer_note TEXT,
  appointment_status VARCHAR(20) DEFAULT 'no-status',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create availability_rules table
CREATE TABLE IF NOT EXISTS grooming.availability_rules (
  id SERIAL PRIMARY KEY,
  type VARCHAR(10) NOT NULL, -- 'weekly' or 'specific'
  day_of_week INTEGER, -- 0-6 (Sunday-Saturday) for weekly
  specific_date DATE, -- for specific date rules
  time VARCHAR(10) NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  appointment_limit SMALLINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create daily_notes table
CREATE TABLE IF NOT EXISTS grooming.daily_notes (
  id SERIAL PRIMARY KEY,
  daily_note_date DATE NOT NULL UNIQUE,
  daily_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create date_marking table
CREATE TABLE IF NOT EXISTS grooming.date_marking (
  id SERIAL PRIMARY KEY,
  type VARCHAR(10) NOT NULL, -- 'weekly' or 'specific'
  marking_day_of_week INTEGER, -- 0-6 (Sunday-Saturday) for weekly
  marking_date DATE, -- for specific date rules
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance (注意 Schema 名稱)
CREATE INDEX IF NOT EXISTS idx_customer_name ON grooming.customers(customer_name); -- 新增索引
CREATE INDEX IF NOT EXISTS idx_customer_phones_customer_id ON grooming.customer_phones(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_phones_phone ON grooming.customer_phones(phone);
CREATE INDEX IF NOT EXISTS idx_dogs_customer_id ON grooming.dogs(customer_id);
CREATE INDEX IF NOT EXISTS idx_dogs_dog_name ON grooming.dogs(dog_name);
CREATE INDEX IF NOT EXISTS idx_service_history_dog_id ON grooming.service_history(dog_id);
CREATE INDEX IF NOT EXISTS idx_service_history_service_date ON grooming.service_history(service_date); -- 新增索引
CREATE INDEX IF NOT EXISTS idx_appointments_dog_id ON grooming.appointments(dog_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON grooming.appointments(appointment_date, appointment_time); -- 複合索引
CREATE INDEX IF NOT EXISTS idx_availability_rules_type ON grooming.availability_rules(type);
CREATE INDEX IF NOT EXISTS idx_availability_rules_specific_date ON grooming.availability_rules(specific_date);
CREATE INDEX IF NOT EXISTS idx_daily_notes_date ON grooming.daily_notes(daily_note_date);

CREATE OR REPLACE FUNCTION grooming.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at (注意 ON 子句中的 Schema 名稱)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_customers_updated_at'
    ) THEN
        CREATE TRIGGER update_customers_updated_at
        BEFORE UPDATE ON grooming.customers
        FOR EACH ROW EXECUTE FUNCTION grooming.update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_customer_phones_updated_at'
    ) THEN
        CREATE TRIGGER update_customer_phones_updated_at
        BEFORE UPDATE ON grooming.customer_phones
        FOR EACH ROW EXECUTE FUNCTION grooming.update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_dogs_updated_at'
    ) THEN
        CREATE TRIGGER update_dogs_updated_at
        BEFORE UPDATE ON grooming.dogs
        FOR EACH ROW EXECUTE FUNCTION grooming.update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_service_history_updated_at'
    ) THEN
        CREATE TRIGGER update_service_history_updated_at
        BEFORE UPDATE ON grooming.service_history
        FOR EACH ROW EXECUTE FUNCTION grooming.update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_appointments_updated_at'
    ) THEN
        CREATE TRIGGER update_appointments_updated_at
        BEFORE UPDATE ON grooming.appointments
        FOR EACH ROW EXECUTE FUNCTION grooming.update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_availability_rules_updated_at'
    ) THEN
        CREATE TRIGGER update_availability_rules_updated_at
        BEFORE UPDATE ON grooming.availability_rules
        FOR EACH ROW EXECUTE FUNCTION grooming.update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_daily_notes_updated_at'
    ) THEN
        CREATE TRIGGER update_daily_notes_updated_at
        BEFORE UPDATE ON grooming.daily_notes
        FOR EACH ROW EXECUTE FUNCTION grooming.update_updated_at_column();
    END IF;
END $$;