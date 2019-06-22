\! echo === start create dbops ===

\! echo === drop database ===
DROP DATABASE IF EXISTS nestify;

\! echo === drop user ===
DROP USER IF EXISTS nestify;

\! echo === create user ===
CREATE USER nestify WITH PASSWORD '123456';

\! echo === create database ===
CREATE DATABASE nestify WITH OWNER nestify ENCODING = 'UTF8';

\! echo === grant privilege ===
GRANT ALL PRIVILEGES ON DATABASE nestify TO nestify;
GRANT ALL ON DATABASE nestify TO nestify;


