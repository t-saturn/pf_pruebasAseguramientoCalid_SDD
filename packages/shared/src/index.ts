/**
 * @mindflow/shared — Interfaces TypeScript compartidas entre frontend y backend.
 *
 * Este módulo exporta todas las entidades de dominio del sistema MindFlow
 * asegurando coherencia de tipos entre la capa de presentación (Next.js)
 * y la capa de negocio (NestJS) sin duplicación de definiciones.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Payload del estudiante autenticado (decodificado del JWT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Representa el payload extraído y verificado de un JWT emitido por el Auth_Service.
 * Coincide con los campos incluidos al firmar el token.
 */
export interface StudentPayload {
  /** Identificador único del estudiante (UUID) */
  studentId: string;
  /** Correo electrónico del estudiante */
  email: string;
  /** Timestamp de emisión del token (issued at, en segundos Unix) */
  iat: number;
  /** Timestamp de expiración del token (en segundos Unix; debe ser iat + 86400) */
  exp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sesión EMA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Representa un período de interacción activa entre un estudiante autenticado
 * y el EMA_Bot. Cada Session agrupa uno o más FatigueRecord y puede generar
 * MicroObjective cuando la fatiga es >= 4.
 */
export interface Session {
  /** Identificador único de la sesión (UUID) */
  id: string;
  /** Identificador del estudiante propietario de la sesión (FK → Student) */
  studentId: string;
  /** Marca temporal de inicio de la sesión en formato ISO 8601 UTC */
  startedAt: string;
  /** Marca temporal de fin de la sesión en formato ISO 8601 UTC; null si aún activa */
  endedAt: string | null;
  /** Indica si la sesión está actualmente activa */
  isActive: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Registro de fatiga (FatigueRecord)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Representa el resultado de una evaluación EMA: la puntuación de fatiga
 * autoreportada por el estudiante en una sesión específica.
 * El campo score debe ser un entero en el rango [1, 5].
 */
export interface FatigueRecord {
  /** Identificador único del registro (UUID) */
  id: string;
  /** Identificador de la sesión a la que pertenece (FK → Session) */
  sessionId: string;
  /** Identificador del estudiante que reportó la fatiga (FK → Student) */
  studentId: string;
  /**
   * Puntuación de fatiga mental autoreportada.
   * Debe ser un entero en el rango [1, 5].
   * 1 = sin fatiga, 5 = fatiga máxima.
   */
  fatigueScore: number;
  /** Marca temporal de registro en formato ISO 8601 UTC */
  recordedAtUtc: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tarea académica (Task)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Representa una actividad académica definida por el estudiante.
 * Las tareas pueden ser descompuestas en MicroObjective cuando la fatiga es elevada.
 * La eliminación es lógica (is_deleted = true) para preservar el historial de auditoría.
 */
export interface Task {
  /** Identificador único de la tarea (UUID) */
  id: string;
  /** Identificador del estudiante propietario (FK → Student) */
  studentId: string;
  /** Nombre de la tarea (requerido, no vacío) */
  name: string;
  /** Descripción opcional de la tarea */
  description: string | null;
  /** Fecha límite de la tarea en formato ISO 8601 UTC */
  deadline: string;
  /** Indica si la tarea ha sido eliminada lógicamente */
  isDeleted: boolean;
  /** Marca temporal de creación en formato ISO 8601 UTC */
  createdAt: string;
  /** Marca temporal de última actualización en formato ISO 8601 UTC */
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Micro-objetivo (MicroObjective)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Unidad de trabajo atómica y accionable generada por el Task_Decomposer
 * cuando la fatiga del estudiante es >= 4.
 * Cada MicroObjective tiene una duración estimada <= 25 minutos.
 */
export interface MicroObjective {
  /** Identificador único del micro-objetivo (UUID) */
  id: string;
  /** Identificador de la tarea padre que fue descompuesta (FK → Task) */
  taskId: string;
  /** Identificador de la sesión en la que fue generado (FK → Session) */
  sessionId: string;
  /** Descripción del micro-objetivo; debe cubrir parte del scope de la tarea padre */
  content: string;
  /**
   * Duración estimada en minutos.
   * Debe ser un entero positivo en el rango (0, 25].
   */
  estimatedMinutes: number;
  /** Indica si el estudiante ha completado este micro-objetivo */
  isCompleted: boolean;
  /**
   * True cuando la tarea padre fue eliminada lógicamente.
   * Los micro-objetivos con este flag son de solo lectura (registro de auditoría).
   */
  isAuditOnly: boolean;
  /** Marca temporal de creación en formato ISO 8601 UTC */
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sobre de respuesta del API (Response Envelope)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estructura de sobre estándar para todas las respuestas del API_Gateway.
 * Todo endpoint de /api/v1/ retorna este formato independientemente del código HTTP.
 * Requisito 9.4: campos `data`, `error` y `status` siempre presentes.
 */
export interface ApiResponse<T = unknown> {
  /** Datos de la respuesta; null en caso de error */
  data: T | null;
  /** Mensaje de error descriptivo; null en caso de éxito */
  error: string | null;
  /** Código HTTP de la respuesta */
  status: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs de creación y actualización (compartidos para validación en cliente)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Datos necesarios para crear una nueva tarea académica.
 */
export interface CreateTaskDto {
  /** Nombre de la tarea (requerido, no vacío) */
  name: string;
  /** Descripción opcional de la tarea */
  description?: string;
  /** Fecha límite en formato ISO 8601 */
  deadline: string;
}

/**
 * Datos para actualizar parcialmente una tarea existente.
 * Todos los campos son opcionales.
 */
export interface UpdateTaskDto {
  /** Nuevo nombre de la tarea */
  name?: string;
  /** Nueva descripción de la tarea */
  description?: string;
  /** Nueva fecha límite en formato ISO 8601 */
  deadline?: string;
}

/**
 * Datos para enviar la puntuación de fatiga en una sesión EMA.
 */
export interface SubmitFatigueScoreDto {
  /**
   * Puntuación de fatiga mental.
   * Debe ser un entero en el rango [1, 5].
   */
  score: number;
}

/**
 * Datos para registrar un nuevo estudiante.
 */
export interface RegisterDto {
  /** Correo electrónico válido */
  email: string;
  /** Contraseña de al menos 8 caracteres */
  password: string;
}

/**
 * Datos para iniciar sesión.
 */
export interface LoginDto {
  /** Correo electrónico del estudiante */
  email: string;
  /** Contraseña del estudiante */
  password: string;
}
