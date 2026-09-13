-- Enables gen_random_uuid() used as the default for every primary key below.
create extension if not exists pgcrypto;
