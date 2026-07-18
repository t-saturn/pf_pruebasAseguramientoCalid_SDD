# Requirements Document

## Introduction

MindFlow es un sistema web impulsado por IA diseñado para mitigar la procrastinación académica mediante micro-interacciones adaptativas. El sistema evalúa el estado cognitivo del estudiante en tiempo real a través de un chatbot basado en la Evaluación Ecológica Momentánea (EMA). Cuando detecta fatiga mental elevada, desglosa automáticamente las tareas complejas en micro-objetivos accesibles, reduciendo la fricción cognitiva y aumentando la probabilidad de acción. La plataforma está construida sobre Next.js (frontend), un backend contenedorizado (NestJS o FastAPI) y PostgreSQL.

---

## Glossary

- **EMA_Bot**: Componente chatbot que aplica la Evaluación Ecológica Momentánea para recopilar el estado cognitivo del estudiante.
- **Fatigue_Score**: Puntuación numérica entera en el rango [1, 5] que representa el nivel de fatiga mental autoreportado por el estudiante.
- **Task_Decomposer**: Módulo de IA responsable de descomponer tareas complejas en micro-objetivos cuando la fatiga es elevada.
- **Micro_Objective**: Unidad de trabajo atómica, accionable y estimada en ≤ 25 minutos, generada por el Task_Decomposer.
- **Session**: Período de interacción activa entre un estudiante autenticado y el EMA_Bot.
- **Student**: Usuario registrado con rol académico que interactúa con el sistema MindFlow.
- **Task**: Actividad académica definida por el Student con nombre, descripción opcional y fecha límite.
- **DB_Writer**: Componente responsable de persistir registros de sesión, fatiga y tareas en PostgreSQL.
- **Auth_Service**: Servicio que gestiona el registro, inicio de sesión y autenticación de Students mediante JWT.
- **API_Gateway**: Punto de entrada HTTP del backend que enruta peticiones del frontend al servicio correspondiente.
- **Notification_Service**: Componente que emite recordatorios y micro-prompts al Student según el contexto de la sesión.
- **Dashboard**: Vista principal del frontend que muestra tareas activas, micro-objetivos pendientes y el historial de fatiga.
- **Session_Serializer**: Componente responsable de serializar y deserializar objetos Session y Fatigue_Score hacia/desde JSON.

---

## Requirements

---

### Requisito 1: Registro e Inicio de Sesión de Estudiantes

**User Story:** Como Student, quiero registrarme e iniciar sesión con mis credenciales, para poder acceder a mi espacio personal de tareas e historial EMA de forma segura.

#### Acceptance Criteria

1. WHEN a Student submits a registration form with a valid email address and a password of at least 8 characters, THE Auth_Service SHALL create a new account and return a confirmation response within 3 seconds.
2. IF a Student submits a registration form with an email address that already exists in the system, THEN THE Auth_Service SHALL return an HTTP 409 error response with a descriptive message without creating a duplicate account.
3. WHEN a Student submits valid credentials in the login form, THE Auth_Service SHALL return a signed JWT with a 24-hour expiration.
4. IF a Student submits invalid credentials in the login form, THEN THE Auth_Service SHALL return an HTTP 401 error response without revealing which field is incorrect.
5. WHILE a Student holds a valid JWT, THE API_Gateway SHALL grant access to all protected endpoints.
6. WHEN a Student's JWT expires, THE API_Gateway SHALL reject the request with HTTP 401 and require re-authentication.

#### Correctness Properties (PBT)

- **Round-Trip Property:** FOR ALL Students with valid credentials, the registration flow followed by login SHALL return a JWT that, when verified, identifies the same Student without loss of identity data.
- **Uniqueness Invariant:** FOR ALL sequences of N registration attempts with the same email address, THE Auth_Service SHALL create exactly one account regardless of the order or concurrency of requests.

---

### Requisito 2: Gestión de Tareas Académicas

**User Story:** Como Student, quiero crear, visualizar, actualizar y eliminar mis tareas académicas, para mantener un seguimiento de mi carga de trabajo y permitir que el sistema me ayude a priorizar.

#### Acceptance Criteria

1. WHEN a Student submits a valid task creation request with a name and deadline, THE API_Gateway SHALL persist the Task via the DB_Writer and return the created Task with a unique identifier within 3 seconds.
2. IF a Student submits a task creation request with a missing name or invalid deadline format, THEN THE API_Gateway SHALL return HTTP 422 with a field-level error message.
3. WHEN a Student requests the list of their Tasks, THE API_Gateway SHALL return exclusively the Tasks belonging to that Student, sorted by deadline in ascending order.
4. WHEN a Student submits a valid update request for an existing Task, THE API_Gateway SHALL persist the changes via the DB_Writer and return the updated Task within 3 seconds.
5. IF a Student attempts to update or delete a Task belonging to another Student, THEN THE API_Gateway SHALL return HTTP 403 without modifying the Task.
6. WHEN a Student deletes a Task, THE DB_Writer SHALL mark the Task as deleted without removing the associated Micro_Objectives from the audit log.

#### Correctness Properties (PBT)

- **Isolation Metamorphic Property:** FOR ALL pairs of distinct Students, the Tasks returned by THE API_Gateway for each Student SHALL be disjoint sets regardless of the total number of Tasks in the system.
- **Ordering Invariant:** FOR ALL Task lists returned by THE API_Gateway, the sequence of deadlines SHALL be non-decreasing (stable ascending order).
- **Logical Deletion Idempotence:** FOR ALL Tasks marked as deleted, applying the deletion again SHALL produce the same state without additional errors.

---

### Requisito 3: Evaluación del Estado Cognitivo mediante EMA

**User Story:** Como Student, quiero que el chatbot me pregunte sobre mi nivel de fatiga mental, para que el sistema pueda adaptar la complejidad de mis tareas a mi estado cognitivo actual.

#### Acceptance Criteria

1. WHEN a Student starts a Session, THE EMA_Bot SHALL present a message requesting a Fatigue_Score on a scale from 1 to 5.
2. IF a Student submits a Fatigue_Score outside the range [1, 5] or a non-integer value, THEN THE EMA_Bot SHALL reject the input and re-prompt the Student without recording the invalid value.
3. WHEN THE EMA_Bot receives a valid Fatigue_Score, THE DB_Writer SHALL persist the Fatigue_Score associated with the current Session and Student with an average latency of 2 to 3 seconds measured over any sequence of 10 consecutive writes.
4. WHEN a Student submits a valid Fatigue_Score, THE EMA_Bot SHALL acknowledge receipt and transition to the task interaction flow within 1 second of persistence confirmation.
5. THE DB_Writer SHALL associate each persisted Fatigue_Score record with a UTC timestamp, the Student identifier, and the Session identifier.

#### Correctness Properties (PBT)

- **Range Invariant:** FOR ALL Fatigue_Score values persisted in the database, the stored value SHALL be an integer in the range [1, 5].
- **Referential Integrity Invariant:** FOR ALL Fatigue_Score records, there SHALL exist a valid Session and a valid Student associated in the same database.
- **Exhaustive Rejection Property:** FOR ALL values outside the range [1, 5] or non-integer values submitted by a Student, THE EMA_Bot SHALL reject them without exception regardless of data type or format submitted.

---

### Requisito 4: Descomposición Adaptativa de Tareas por Fatiga

**User Story:** Como Student con fatiga mental elevada, quiero que el sistema descomponga mis tareas complejas automáticamente, para poder tomar pasos pequeños y accionables sin sentirme abrumado.

#### Acceptance Criteria

1. WHEN THE EMA_Bot records a Fatigue_Score ≥ 4 for the current Session, THE Task_Decomposer SHALL automatically decompose each active Task selected by the Student into Micro_Objectives.
2. WHEN THE EMA_Bot records a Fatigue_Score ≤ 3 for the current Session, THE Task_Decomposer SHALL present the Task in its original form without decomposition.
3. WHEN THE Task_Decomposer decomposes a Task, THE Task_Decomposer SHALL generate between 2 and 7 Micro_Objectives per Task, each with an estimated duration of no more than 25 minutes.
4. WHEN THE Task_Decomposer generates Micro_Objectives, THE DB_Writer SHALL persist all Micro_Objectives linked to the original Task and the current Session within 3 seconds.
5. IF THE Task_Decomposer fails to generate Micro_Objectives due to an AI service error, THEN THE API_Gateway SHALL return an HTTP 502 error response and THE EMA_Bot SHALL present the Task in its original form as a fallback.
6. FOR ALL Tasks decomposed under the same condition of Fatigue_Score ≥ 4, THE Task_Decomposer SHALL produce Micro_Objectives whose combined scope covers the complete description of the original Task without omissions.

#### Correctness Properties (PBT)

- **Cardinality Invariant:** FOR ALL decomposed Tasks, the number of generated Micro_Objectives SHALL always be in the interval [2, 7] regardless of the length or complexity of the Task description.
- **Duration Invariant:** FOR ALL Micro_Objectives generated by THE Task_Decomposer, the estimated duration SHALL be a positive value less than or equal to 25 minutes.
- **Coverage Property:** FOR ALL decomposed Tasks, the union of Micro_Objective content SHALL cover all semantic elements present in the original Task description.
- **Threshold Metamorphic Property:** FOR ALL Tasks with Fatigue_Score ≤ 3, THE Task_Decomposer SHALL produce exactly 0 Micro_Objectives (no decomposition), guaranteeing behavioral separation according to the fatigue threshold.

---

### Requisito 5: Dashboard del Estudiante

**User Story:** Como Student, quiero ver todas mis tareas activas, micro-objetivos pendientes y el historial de fatiga en un solo lugar, para entender mi progreso y patrones cognitivos a lo largo del tiempo.

#### Acceptance Criteria

1. WHEN a Student loads the Dashboard, THE Dashboard SHALL display all active Tasks sorted by deadline in ascending order and all pending Micro_Objectives grouped by their parent Task.
2. WHEN a Student marks a Micro_Objective as completed in the Dashboard, THE DB_Writer SHALL persist the completed status and THE Dashboard SHALL reflect the update within 2 seconds without requiring a full page reload.
3. WHEN a Student views the fatigue history section, THE Dashboard SHALL display the Fatigue_Score values from the last 30 Sessions of that Student, rendered as a time-series chart.
4. IF a Student has no registered Sessions, THEN THE Dashboard SHALL display an empty-state message inviting the Student to start their first EMA Session.
5. WHILE a Student is authenticated, THE Dashboard SHALL display only data belonging to that Student and no data from other Students.

#### Correctness Properties (PBT)

- **Data Isolation Invariant:** FOR ALL pairs of distinct Students, the data displayed in each Student's Dashboard SHALL be completely disjoint with no information leakage between accounts.
- **Update Consistency Property:** FOR ALL sequences of N Micro_Objective completion marks, THE Dashboard SHALL reflect exactly N accumulated changes without duplicates or losses.
- **History Ordering Invariant:** FOR ALL Fatigue_Score lists displayed in the chart, the values SHALL appear ordered chronologically in ascending order by UTC timestamp.

---

### Requisito 6: Notificaciones y Micro-Prompts Contextuales

**User Story:** Como Student, quiero recibir recordatorios oportunos y micro-prompts motivacionales, para mantenerme comprometido con mis tareas sin distracciones por interrupciones excesivas.

#### Acceptance Criteria

1. WHEN a Task's deadline is within the next 24 hours and the Task has pending Micro_Objectives, THE Notification_Service SHALL send a reminder notification to the Student.
2. WHEN THE Notification_Service dispatches a notification, THE Notification_Service SHALL record the dispatch event with a UTC timestamp and delivery status in the DB_Writer within 3 seconds.
3. IF THE Notification_Service fails to deliver a notification after 3 consecutive attempts, THEN THE Notification_Service SHALL mark the notification as failed in the DB_Writer and cease retrying for that event.
4. WHILE a Student is in an active Session, THE Notification_Service SHALL suppress task deadline reminders to avoid interrupting the EMA flow.
5. THE Notification_Service SHALL dispatch no more than 3 notifications per Student per 24-hour period to prevent notification fatigue.

#### Correctness Properties (PBT)

- **Frequency Limit Invariant:** FOR ALL Students in any 24-hour window, the total number of dispatched notifications SHALL always be less than or equal to 3 regardless of the number of Tasks with upcoming deadlines.
- **Session Suppression Property:** FOR ALL Students in an active Session, THE Notification_Service SHALL dispatch exactly 0 deadline reminder notifications during the full duration of the Session.
- **Exhaustive Logging Invariant:** FOR ALL notifications dispatched or failed, there SHALL exist exactly one corresponding record in the DB_Writer with a UTC timestamp and delivery status.

---

### Requisito 7: Persistencia y Rendimiento de la Base de Datos

**User Story:** Como operador del sistema, quiero que todas las escrituras se completen dentro del presupuesto de latencia definido, para que el flujo cognitivo del estudiante nunca sea interrumpido por demoras en la base de datos.

#### Acceptance Criteria

1. THE DB_Writer SHALL persist Session, Fatigue_Score, Task, and Micro_Objective records in PostgreSQL with an average latency of 2 to 3 seconds measured over any sequence of 10 consecutive write operations under normal load conditions.
2. WHEN THE DB_Writer receives a write request, THE DB_Writer SHALL use exclusively parameterized queries to prevent SQL injection.
3. IF a write operation fails due to a database connection error, THEN THE DB_Writer SHALL retry the operation once after 500 milliseconds before returning an error response to the caller.
4. THE DB_Writer SHALL enforce foreign key constraints between Student, Session, Task, Micro_Objective, and Fatigue_Score records to guarantee referential integrity.
5. WHERE the deployment environment supports connection pooling, THE DB_Writer SHALL use a connection pool with a minimum of 2 and a maximum of 10 connections.

#### Correctness Properties (PBT)

- **Retry Idempotence Property:** FOR ALL write operations that fail and are retried once, THE DB_Writer SHALL produce exactly one persisted record (no duplicates) when the retry succeeds.
- **Referential Integrity Invariant:** FOR ALL persisted Micro_Objective or Fatigue_Score records, there SHALL exist a valid parent Task or Session respectively in the database.
- **Injection Safety Invariant:** FOR ALL arbitrary text inputs provided as field values, THE DB_Writer SHALL persist the value literally without interpreting SQL metacharacters as executable commands.

---

### Requisito 8: Infraestructura Contenedorizada

**User Story:** Como desarrollador, quiero que el backend y la base de datos se ejecuten en contenedores Docker orquestados con docker-compose, para que el entorno sea reproducible y portable entre máquinas.

#### Acceptance Criteria

1. THE system SHALL provide a `docker-compose.yml` file that defines service containers for the backend API and for PostgreSQL.
2. WHEN a developer executes `docker-compose up` on a machine with Docker installed, THE system SHALL start all required services and expose the API on a configurable port within 60 seconds.
3. THE PostgreSQL container SHALL mount a named volume to persist database data across container restarts.
4. THE backend container SHALL read all environment-specific configuration values (database URL, JWT secret, AI service key) exclusively from environment variables injected at runtime.
5. IF the PostgreSQL container is unreachable at startup, THEN THE backend container SHALL retry the connection up to 5 times with a 5-second interval before exiting with a non-zero status code.

#### Correctness Properties (PBT)

- **Startup Idempotence Property:** FOR ALL numbers of consecutive `docker-compose up` followed by `docker-compose down` executions, THE system SHALL start in a consistent state without corrupted data or port conflicts.
- **Volume Persistence Invariant:** FOR ALL sequences of PostgreSQL container restarts, data persisted before the restart SHALL be accessible after the restart without loss.

---

### Requisito 9: Elección y Arquitectura del Backend

**User Story:** Como arquitecto técnico, quiero una recomendación razonada entre NestJS y FastAPI para el backend, para que el framework elegido se alinee con las habilidades del equipo, las necesidades de rendimiento y la mantenibilidad a largo plazo.

#### Acceptance Criteria

1. THE system design document SHALL include a comparison of NestJS (Node.js/TypeScript) and FastAPI (Python) covering: developer experience with the existing Next.js/TypeScript frontend, asynchronous performance characteristics, AI/ML library ecosystem, and community support.
2. THE system design document SHALL declare a single recommended backend framework with a documented rationale based on the criteria in criterion 1.
3. THE API_Gateway SHALL expose a RESTful API with versioned endpoints under the route prefix `/api/v1/`.
4. THE API_Gateway SHALL return all responses in JSON format with a consistent envelope structure containing at minimum the fields `data`, `error`, and `status`.
5. WHEN THE API_Gateway receives a request to an undefined route, THE API_Gateway SHALL return HTTP 404 with a JSON error body.

#### Correctness Properties (PBT)

- **Response Structure Invariant:** FOR ALL responses returned by THE API_Gateway, the response JSON SHALL contain the fields `data`, `error`, and `status` regardless of the operation type or HTTP status code.
- **Route Versioning Invariant:** FOR ALL endpoints exposed by THE API_Gateway, the route SHALL begin with the prefix `/api/v1/` without exception for any resource.
- **Undefined Route Response Property:** FOR ALL routes not defined in THE API_Gateway, the response SHALL always be HTTP 404 with a valid JSON body regardless of the HTTP method used.

---

### Requisito 10: Parser y Serialización de Datos de Sesión (Round-Trip)

**User Story:** Como desarrollador, quiero que los datos de sesión y EMA se serialicen y deserialicen sin pérdida, para que los registros almacenados sean siempre equivalentes a los objetos en memoria que los originaron.

#### Acceptance Criteria

1. WHEN a Session record is serialized to JSON for transport or storage, THE Session_Serializer SHALL produce a JSON string that deserializes back to an equivalent Session object (round-trip property).
2. WHEN a Fatigue_Score record is serialized to JSON, THE Session_Serializer SHALL preserve the integer type of the Fatigue_Score field without coercion to string or floating-point number.
3. FOR ALL valid Session objects, serializing, then deserializing, then serializing again SHALL produce an identical JSON string (serialization idempotence).
4. IF a JSON payload for a Session has missing required fields or type incompatibilities, THEN THE Session_Serializer SHALL return a descriptive validation error without partially constructing a Session object.
5. THE Session_Serializer SHALL serialize and deserialize all field data types (integers, strings, UTC timestamps, booleans) preserving the original type without implicit coercion.

#### Correctness Properties (PBT)

- **Strict Round-Trip Property:** FOR ALL randomly generated Session objects with valid values, `deserialize(serialize(session)) == session` SHALL hold for any combination of field values within the valid domain.
- **Serialization Idempotence Property:** FOR ALL valid Session objects, `serialize(deserialize(serialize(session))) == serialize(session)` SHALL hold, guaranteeing that serialization is stable.
- **Type Preservation Invariant:** FOR ALL integer-type fields (including Fatigue_Score), FOR ALL values in the range [1, 5], THE Session_Serializer SHALL produce a JSON integer-type value, never a string or float.
- **Invalid Input Rejection Property:** FOR ALL JSON inputs with missing fields, incorrect types, or out-of-range values, THE Session_Serializer SHALL return an error without constructing any partial Session object.
