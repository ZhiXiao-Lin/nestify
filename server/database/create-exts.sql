\c nestify postgres;

\! echo === create ltree ===
create extension ltree;

\! echo === create pgcrypto ===
create extension pgcrypto;

\! echo === create tablefunc ===
create extension tablefunc;

\! echo === create uuid-ossp ===
create extension "uuid-ossp";

\q