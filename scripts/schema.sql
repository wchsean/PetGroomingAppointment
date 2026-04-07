-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS grooming;

-- Create customers table
CREATE TABLE IF NOT EXISTS grooming.customers (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(255),
  customer_first_name  TEXT,
  customer_last_name   TEXT,
  customer_email VARCHAR(255),
  customer_note TEXT,
  customer_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grooming.customer_phones (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES grooming.customers(id) ON DELETE CASCADE,
    phone_owner VARCHAR(255),
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
  dog_appearance TEXT,
  behavior_profile JSONB DEFAULT '[]'::jsonb, -- 新增行為特徵欄位
  dog_weight NUMERIC(5,2),
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
-- DROP TABLE IF EXISTS grooming.appointments CASCADE;

CREATE TABLE IF NOT EXISTS grooming.appointments (
  id SERIAL PRIMARY KEY,

  -- Slot relation（核心）
  appointment_slot_id INTEGER NOT NULL
    REFERENCES grooming.appointment_slots(id),

  -- Customer info（冗餘資料，避免 join）
  appointment_customer_name VARCHAR(255),
  appointment_customer_first_name TEXT,
  appointment_customer_last_name TEXT,
  customer_id INTEGER
    REFERENCES grooming.customers(id) ON DELETE SET NULL,
  customer_email VARCHAR(255),
  appointment_phone VARCHAR(20),

  -- Dog info
  appointment_dog_name VARCHAR(255),
  dog_id INTEGER
    REFERENCES grooming.dogs(id) ON DELETE SET NULL,
  appointment_dog_breed VARCHAR(255),
  appointment_dog_weight NUMERIC(5,2),
  appointment_dog_appearance TEXT,

  -- Booking time（保留快取，避免 join slot）
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,

  -- Services
  today_services TEXT,
  today_price NUMERIC(10,2),
  today_note TEXT,
  customer_note TEXT,

  -- Behavior
  behavioral_issues JSONB DEFAULT '[]'::jsonb,

  -- Status（嚴格控制）
  booking_status VARCHAR(20),

  appointment_status VARCHAR(20),

  -- Source（不設 default，避免污染）
  booking_source VARCHAR(20)
    CHECK (booking_source IN ('admin','online','phone','system')),

  -- System flags
  appointment_active BOOLEAN DEFAULT TRUE,
  send_appointment_remind_sms BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,

  -- Online booking
  policy_agreed_at TIMESTAMPTZ,
  request_id VARCHAR(100),

  -- Capacity control
  capacity_units SMALLINT DEFAULT 1 CHECK (capacity_units > 0),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Indexes（效能關鍵）
-- =========================
CREATE INDEX IF NOT EXISTS idx_appointments_date_time
ON grooming.appointments (appointment_date, appointment_time);

CREATE INDEX IF NOT EXISTS idx_appointments_slot_id
ON grooming.appointments (appointment_slot_id);

CREATE INDEX IF NOT EXISTS idx_appointments_customer_id
ON grooming.appointments (customer_id);

CREATE INDEX IF NOT EXISTS idx_appointments_dog_id
ON grooming.appointments (dog_id);

-- =========================
-- Trigger（自動更新 updated_at）
-- =========================
CREATE OR REPLACE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON grooming.appointments
FOR EACH ROW
EXECUTE FUNCTION grooming.update_updated_at_column();


-- Create appointment_slots table
CREATE TABLE IF NOT EXISTS grooming.appointment_slots (
  id SERIAL PRIMARY KEY,
  slot_date DATE NOT NULL,                     -- 具體日期
  slot_type VARCHAR(50) NOT NULL,                 -- 小狗/大狗/特殊資源等
  slot_time TIME NOT NULL,                        -- 時間
  is_enabled BOOLEAN DEFAULT TRUE,                -- slot 是否可用
  capacity SMALLINT NOT NULL CHECK (capacity > 0), -- 最大預約數
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
);



-- Create daily_notes table
CREATE TABLE IF NOT EXISTS grooming.daily_notes (
  id SERIAL PRIMARY KEY,
  daily_note_date DATE NOT NULL UNIQUE,
  daily_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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


-- Create date_marking table
CREATE TABLE IF NOT EXISTS grooming.date_marking (
  id SERIAL PRIMARY KEY,
  type VARCHAR(10) NOT NULL, -- 'weekly' or 'specific'
  marking_day_of_week INTEGER, -- 0-6 (Sunday-Saturday) for weekly
  marking_date DATE, -- for specific date rules
  color VARCHAR(255), -- 顏色標記
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grooming.sms_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,   -- 名稱，例如 'appointment_reminder'
    shop_name VARCHAR(255) NOT NULL,
    shop_phone VARCHAR(50) NOT NULL,
    sms_sender VARCHAR(50) NOT NULL,
    message_template TEXT NOT NULL,      -- 訊息模板
    cron_rule VARCHAR(50) NOT NULL,      -- Cron 規則，例如 '0 9 * * *' 表示每天上午 9 點
    lookahead_days INT NOT NULL, -- 要查詢的天數，例如 1 天內的預約
    enabled BOOLEAN DEFAULT FALSE,        -- 是否啟用
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- OTP VERIFICATIONS TABLE (for phone verification)
-- ============================================
CREATE TABLE IF NOT EXISTS grooming.otp_verifications (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
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
CREATE INDEX IF NOT EXISTS idx_appointment_slots_type ON grooming.appointment_slots(slot_type);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_slot_date ON grooming.appointment_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_daily_notes_date ON grooming.daily_notes(daily_note_date);
-- OTP verifications
CREATE INDEX IF NOT EXISTS idx_otp_verifications_phone ON grooming.otp_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires_at ON grooming.otp_verifications(expires_at);

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
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_appointment_slots_updated_at'
    ) THEN
        CREATE TRIGGER update_appointment_slots_updated_at
        BEFORE UPDATE ON grooming.appointment_slots
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

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_otp_verifications_updated_at') THEN
        CREATE TRIGGER update_otp_verifications_updated_at
        BEFORE UPDATE ON grooming.otp_verifications
        FOR EACH ROW EXECUTE FUNCTION grooming.update_updated_at_column();
    END IF;
END $$;


-- ============================================
-- FUNCTION: Clean up expired OTP records
-- ============================================
CREATE OR REPLACE FUNCTION grooming.cleanup_expired_otps()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM grooming.otp_verifications
  WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;