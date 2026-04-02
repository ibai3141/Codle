# CODLE - Guía de configuración de base de datos

## Requisitos previos

- Tener una cuenta en [Supabase](https://supabase.com)
- Tener Liquibase Community instalado (versión estable)
- Tener Java instalado (versión 11 o superior)
- Tener el driver PostgreSQL JDBC

## Paso 1: Crear proyecto en Supabase

1. Ve a [Supabase](https://supabase.com) y crea un nuevo proyecto
2. Guarda las credenciales:
   - URL del proyecto
   - Contraseña de la base de datos
   - Connection string (lo verás en Settings → Database)

3. Fichero properties
    changeLogFile=db.changelog-master.yaml
    url=jdbc:postgresql://aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require
    username=postgres.jhpcifbntjoclvxdfnpr
    password=equipACodldldl34+_7
    driver=org.postgresql.Driver
    classpath=lib/postgresql-42.7.10.jar

4. Comandos basicos

    # Entrar a la carpeta
    cd backend/liquibase

    # Ver cambios pendientes
    liquibase status --verbose

    # Generar SQL sin ejecutar
    liquibase updateSQL

    # Ejecutar migraciones
    liquibase update

    # Ver historial de migraciones
    liquibase history

    # Deshacer el último cambio
    liquibase rollback --count=1
