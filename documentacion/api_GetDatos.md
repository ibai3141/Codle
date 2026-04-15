# Extracción de datos por la api getData

## Objetivo de este documento
Explicar el uso de la api getData y sus opciones disponibles


## /getData/lengByNom
Devuelve los datos de un lenguaje de programación que tenga cierto nombre pasado como parametro

/getData/lengByNom?nom=<nomLenguaje>


## /getData/lengById
Devuelve los datos de un lenguaje de programación que tenga cierto id pasado como parametro

/getData/lengById?id=<idLenguaje>


## /getData/lengByAlias
Devuelve los datos de un lenguaje de programación que tenga cierto alias asignado a este, 
el alias es pasado como parametro

/getData/lengByAlias?alias=<aliasLenguaje>



## /getData/creatorByNom
Devuelve los datos de un creador que tenga ciertos nombre y apellido pasados por parametros

/getData/creatorByNom?nom=<nombre>&ape=<apellido>


## /getData/creatorById
Devuelve los datos de un creador que tenga cierto id pasado como parametro

/getData/creatorById?id=<idCreador>



## /getData/ejecucionById
Devuelve los datos de un tipo de ejecución que tenga cierto id pasado como parametro

/getData/ejecucionById?id=<idEjecucion>


## /getData/fortTipadoById
Devuelve los datos sobre la fortaleza del tipado que tenga cierto id pasado como parametro

/getData/fortTipadoById?id=<idFortTipado>

## /getData/paradigmaById
Devuelve los datos sobre una paradigma que tenga cierto id pasado como parametro

/getData/paradigmaById?id=<idParadigma>


## /getData/tipadoTiempoById
Devuelve los datos sobre un tipado_tiempo que tenga cierto id pasado como parametro

/getData/tipadoTiempoById?id=<idTipadoTiempo>



## /getData/lengAliasById
Devuelve los datos sobre un alias que tenga cierto id pasado como parametro

/getData/lengAliasById?id=<idAlias>

## /getData/lengAliasByAlias
Devuelve los datos sobre un alias que tenga cierto alias pasado como parametro

/getData/lengAliasByAlias?alias=<alias>

## /getData/lengIdByAlias
Devuelve unicamente el id de un alias que tenga cierto alias pasado como parametro

/getData/lengIdByAlias?alias=<alias>
