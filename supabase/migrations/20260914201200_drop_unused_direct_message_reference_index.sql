-- V4 follow-up: history is queried by conversation and source metadata is
-- resolved from its owning table, so this speculative polymorphic index adds
-- write cost without serving a read path.
drop index public.care_messages_reference_lookup;
