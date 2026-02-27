import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load .env
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error("Faltan las variables de entorno VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function run() {
    const email = 'admin@edugestion.com';
    const password = 'adminpassword123';

    console.log('Creando usuario administrador...');

    // 1. Create User via Admin API
    const { data: userAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    let userId;
    if (authError) {
        if (authError.message.includes('already registered') || authError.code === 'email_exists') {
            console.log('El usuario auth ya existe. Obteniendo ID...');
            const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            if (listError) {
                console.error("No se pudo listar los usuarios:", listError);
                return;
            }
            const existingUser = listData.users.find((u: any) => u.email === email);
            if (!existingUser) {
                console.error("Usuario no encontrado en la lista a pesar de existir");
                return;
            }
            userId = existingUser.id;
        } else {
            console.error('Error creando usuario en Auth:', authError);
            return;
        }
    } else {
        userId = userAuth.user.id;
    }

    console.log(`Usuario en Auth con ID: ${userId}`);

    // 2. Insert Profile (upsert instead of direct insert to avoid conflicts if profile already exists)
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert([
        {
            id: userId,
            full_name: 'Administrador Principal',
            role: 'admin'
        }
    ]);

    if (profileError) {
        if (profileError.code !== '23505') { // ignore duplicate key
            console.error('Error creando el perfil en la tabla profiles:', profileError);
            return;
        }
    }

    console.log(`\n✅ ¡Usuario administrador configurado con éxito!`);
    console.log(`Úsalo para iniciar sesión:`);
    console.log(`Email: ${email}`);
    console.log(`Contraseña: ${password}\n`);
}

run();
