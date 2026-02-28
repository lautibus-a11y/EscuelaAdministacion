/**
 * Utilidad global de auditoría.
 * Llama a esta función después de cada operación exitosa en cualquier página.
 * Los logs quedan en la tabla `activity_logs` de Supabase, editables/consultables.
 */
import { supabase } from './supabaseClient';

export type LogAction = 'CREAR' | 'EDITAR' | 'ELIMINAR';
export type LogEntity =
    | 'institución'
    | 'docente'
    | 'alumno'
    | 'cargo'
    | 'curso'
    | 'asignación'
    | 'suplencia'
    | 'visita';

export async function logActivity(
    entity: LogEntity,
    action: LogAction,
    description: string
) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('activity_logs').insert([{
            entity,
            action,
            description,
            user_id: user?.id ?? null,
        }]);
    } catch {
        // Logging is non-blocking — never throw
    }
}
