-- 한가위 럭키드로우: 응모 식별을 이메일 → 휴대폰 번호로 변경 (2026-09-17)
-- 기존 DB(chuseok_schema.sql 적용된 곳)에서 한 번 실행. 여러 번 실행해도 안전.

alter table chuseok_entries add column if not exists employee_phone text;   -- 숫자만 저장 (예: 01012345678)
alter table chuseok_entries alter column employee_email drop not null;       -- 이메일은 더 이상 받지 않음 (기존 행 보존)

drop index if exists chuseok_entries_email_uidx;
create unique index if not exists chuseok_entries_phone_uidx on chuseok_entries (employee_phone);
