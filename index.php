<?php
    $allowed_origins = [
        'https://proyecto-final-wine-two.vercel.app',
        'http://localhost:4200'
    ];
    
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
    } else {
        // Opcional: rechazar o no poner Access-Control-Allow-Origin para otros orígenes
        header('HTTP/1.1 403 Forbidden');
        exit('Origen no permitido');
    }
    
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Max-Age: 86400');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    // Asegurarse de que los errores se manejen como JSON
    ini_set('display_errors', 'Off');
    error_reporting(E_ALL);

    // Establecer el tipo de contenido como JSON
    header('Content-Type: application/json; charset=utf-8');

    // Manejar errores fatales
    register_shutdown_function(function() {
        $error = error_get_last();
        if ($error !== null && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_PARSE])) {
            http_response_code(500);
            echo json_encode([
                'error' => 'Error fatal del servidor',
                'message' => $error['message'],
                'file' => $error['file'],
                'line' => $error['line']
            ]);
            exit;
        }
    });

    // Configurar el manejador de errores personalizado
    set_error_handler(function($errno, $errstr, $errfile, $errline) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Error del servidor',
            'message' => $errstr,
            'file' => $errfile,
            'line' => $errline
        ]);
        exit;
    });

    // Configurar el manejador de excepciones
    set_exception_handler(function($e) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Excepción no capturada',
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]);
        exit;
    });

    $DB_HOST = getenv('DB_HOST');
    $DB_PORT = getenv('DB_PORT');
    $DB_NAME = getenv('DB_NAME');
    $DB_USER = getenv('DB_USER');
    $DB_PASS = getenv('DB_PASS');

    try {
        $pdo = new PDO(
            "pgsql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_NAME;sslmode=require",
            $DB_USER,
            $DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Error de conexión a la base de datos',
            'details' => $e->getMessage()
        ]);
        exit;
    }

    function getJson() {
        $rawData = file_get_contents('php://input');
        if ($rawData === false) {
            return null;
        }
        
        $data = json_decode($rawData, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            header('Content-Type: application/json');
            http_response_code(400);
            echo json_encode([
                'error' => 'JSON inválido',
                'details' => json_last_error_msg()
            ]);
            exit;
        }
        
        return $data;
    }

    function validate($data, $fields) {
        $errors = [];
        foreach ($fields as $f) {
            if (empty($data[$f])) {
                $errors[] = "Campo {$f} es obligatorio.";
            }
        }
        return $errors;
    }

    function getAuthUser() {
        $headers = getallheaders();
        if (empty($headers['Authorization'])) {
            return null;
        }

        $auth = $headers['Authorization'];
        if (!preg_match('/^Bearer (.+)$/', $auth, $m)) {
            return null;
        }

        $jwt = $m[1];
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            return null;
        }

        $payload = json_decode(base64_decode($parts[1]), true);
        if (!$payload || empty($payload['id_user']) || empty($payload['exp'])) {
            return null;
        }

        if ($payload['exp'] < time()) {
            return null;
        }

        $secret = getenv('JWT_SECRET');
        $signature = base64_encode(hash_hmac('sha256', "$parts[0].$parts[1]", $secret, true));
        if ($signature !== $parts[2]) {
            return null;
        }

        return $payload;
    }

    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $uri = preg_replace('#^/index\.php#', '', $uri);
    if ($uri === '') {
        $uri = '/';
    }

    $uri = str_replace('/rallies/', '/rally/', $uri);

    $method = $_SERVER['REQUEST_METHOD'];

    switch (true) {
        // Obtener datos del usuario autenticado
        case $uri === '/user/profile' && $method === 'GET':
            $auth = getAuthUser();
            if (!$auth) {
                http_response_code(401);
                echo json_encode(['error' => 'No autorizado']);
                break;
            }

            $stmt = $pdo->prepare(
                'SELECT id_user, name, email, rol, creation_date 
                FROM "user" 
                WHERE id_user = :id'
            );
            $stmt->execute([':id' => $auth['id_user']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                http_response_code(404);
                echo json_encode(['error' => 'Usuario no encontrado']);
                break;
            }

            echo json_encode($user);
            break;

        // Actualizar datos del usuario
        case $uri === '/user/profile' && $method === 'PUT':
            $auth = getAuthUser();
            if (!$auth) {
                http_response_code(401);
                echo json_encode(['error' => 'No autorizado']);
                break;
            }

            $input = getJson();
            $fields = []; 
            $params = [':id' => $auth['id_user']];

            if (isset($input['name'])) {
                $fields[] = 'name = :name';
                $params[':name'] = $input['name'];
            }
            
            if (isset($input['email'])) {
                $stmt = $pdo->prepare('SELECT id_user FROM "user" WHERE email = :email AND id_user != :id');
                $stmt->execute([':email' => $input['email'], ':id' => $auth['id_user']]);
                if ($stmt->fetch()) {
                    http_response_code(400);
                    echo json_encode(['error' => 'El email ya está en uso']);
                    break;
                }
                $fields[] = 'email = :email';
                $params[':email'] = $input['email'];
            }

            if (isset($input['password'])) {
                $fields[] = 'password = :pass';
                $params[':pass'] = password_hash($input['password'], PASSWORD_BCRYPT);
            }

            if (empty($fields)) {
                http_response_code(400);
                echo json_encode(['error' => 'No hay datos para actualizar']);
                break;
            }

            $sql = 'UPDATE "user" SET ' . implode(', ', $fields) . ' WHERE id_user = :id';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            echo json_encode(['updated' => true]);
            break;

        // Eliminar cuenta de usuario
        case $uri === '/user/profile' && $method === 'DELETE':
            $auth = getAuthUser();
            if (!$auth) {
                http_response_code(401);
                echo json_encode(['error' => 'No autorizado']);
                break;
            }
        
            try {
                $stmt = $pdo->prepare('DELETE FROM "user" WHERE id_user = :id');
                $stmt->execute([':id' => $auth['id_user']]);
                echo json_encode(['deleted' => true]);
            } catch (Exception $e) {
                http_response_code(500);
                error_log("Error deleting account: " . $e->getMessage());
                echo json_encode([
                    'error' => 'Error al eliminar la cuenta',
                    'message' => $e->getMessage()
                ]);
            }
            break;

        case $uri === '/' && $method === 'GET':
            echo json_encode(['message' => 'API funcionando correctamente']);
            break;

        case $uri === '/register' && $method === 'POST':
            header('Content-Type: application/json');
            try {
                $input = getJson();
                
                if ($input === null) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Datos de entrada inválidos']);
                    break;
                }
                
                $errs = validate($input, ['name','email','password']);
                if ($errs) {
                    http_response_code(400);
                    echo json_encode(['errors' => $errs]);
                    break;
                }

                // Verificar si el email ya existe
                $stmt = $pdo->prepare('SELECT id_user FROM "user" WHERE email = :email');
                $stmt->execute([':email' => $input['email']]);
                if ($stmt->fetch()) {
                    http_response_code(400);
                    echo json_encode(['error' => 'El email ya está registrado']);
                    break;
                }

                $stmt = $pdo->prepare(
                    'INSERT INTO "user" (name, email, password)
                    VALUES (:name, :email, :pass)
                    RETURNING id_user'
                );
                
                $stmt->execute([
                    ':name' => $input['name'],
                    ':email' => $input['email'],
                    ':pass' => password_hash($input['password'], PASSWORD_BCRYPT)
                ]);
                
                $id = $stmt->fetchColumn();
                echo json_encode(['id_user' => $id]);
                
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    'error' => 'Error al registrar el usuario',
                    'message' => $e->getMessage()
                ]);
            }
            break;

        case $uri === '/login' && $method === 'POST':
            $input = getJson();
            $stmt = $pdo->prepare(
                'SELECT id_user,password,rol FROM "user" WHERE email = :email'
            );
            $stmt->execute([':email'=>$input['email']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$user || !password_verify($input['password'], $user['password'])) {
                http_response_code(401);
                echo json_encode(['error'=>'Credenciales inválidas']);
                break;
            }
            $payload = [
                'id_user'=>$user['id_user'],
                'rol'=>$user['rol'],
                'exp'=>time()+3600
            ];
            $header = base64_encode(json_encode(['alg'=>'HS256','typ'=>'JWT']));
            $body   = base64_encode(json_encode($payload));
            $secret = getenv('JWT_SECRET');
            $sig = base64_encode(hash_hmac('sha256', "$header.$body", $secret, true));
            $jwt = "$header.$body.$sig";
            echo json_encode(['token'=>$jwt]);
            break;

        case $uri === '/rally/current' && $method === 'GET':
            $stmt = $pdo->prepare(
                'SELECT * FROM rallies
                WHERE start_date <= CURRENT_DATE
                AND end_date   >= CURRENT_DATE
                LIMIT 1'
            );
            $stmt->execute();
            $rally = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$rally) {
                http_response_code(404);
                echo json_encode(['error'=>'No hay rally activo']);
                break;
            }
            echo json_encode($rally);
            break;

        case preg_match('#^/photos$#', $uri) && $method === 'GET':
            $state = $_GET['state']   ?? null;
            $rally = $_GET['rally_id']?? null;
            
            $sql = 'SELECT * FROM photography WHERE 1=1';
            $params = [];

            if ($state !== null) {
                $sql .= ' AND state = :state';
                $params[':state'] = $state;
            }

            if ($rally !== null) {
                $sql .= ' AND id_rally = :rally_id';
                $params[':rally_id'] = $rally;
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case preg_match('#^/photos/(\d+)$#', $uri, $m) && $method === 'GET':
            $stmt = $pdo->prepare(
                'SELECT * FROM photography WHERE id_photo = :id'
            );
            $stmt->execute([':id'=>$m[1]]);
            $photo = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$photo) {
                http_response_code(404);
                echo json_encode(['error'=>'Foto no encontrada']);
                break;
            }
            echo json_encode($photo);
            break;

        case $uri === '/photos' && $method === 'POST':
            $input = getJson();
            $errs = validate($input, ['id_user','title','file']);
            if (!empty($input['file']) && !preg_match('#^data:image/[^;]+;base64,#', $input['file'])) {
                $errs[] = "El campo 'file' debe contener una imagen en formato Base64 válida.";
            }
            if ($errs) {
                http_response_code(400);
                echo json_encode(['errors'=>$errs]);
                break;
            }

            // Obtener el rally activo y su configuración
            $stmt = $pdo->prepare(
                'SELECT c.max_photos_user 
                FROM configuration c
                INNER JOIN rallies r ON r.id_rally = c.id_rally
                WHERE r.start_date <= CURRENT_DATE 
                AND r.end_date >= CURRENT_DATE'
            );
            $stmt->execute();
            $config = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$config) {
                http_response_code(400);
                echo json_encode(['error' => 'No hay un rally activo o no tiene configuración']);
                break;
            }

            // Verificar si el usuario ha alcanzado el límite de fotos
            $stmt = $pdo->prepare(
                'SELECT COUNT(*) as photo_count 
                FROM photography 
                WHERE id_user = :user_id 
                AND id_rally = :rally_id'
            );
            $stmt->execute([
                ':user_id' => $input['id_user'],
                ':rally_id' => $input['id_rally']
            ]);
            $count = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($count['photo_count'] >= $config['max_photos_user']) {
                http_response_code(400);
                echo json_encode(['error' => 'Has alcanzado el límite máximo de fotografías para este rally']);
                break;
            }

            // Verificar si la foto ya existe (comparando el contenido)
            $stmt = $pdo->prepare(
                'SELECT COUNT(*) as duplicate_count 
                FROM photography 
                WHERE id_user = :user_id 
                AND file = :file'
            );
            $stmt->execute([
                ':user_id' => $input['id_user'],
                ':file' => $input['file']
            ]);
            $duplicate = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($duplicate['duplicate_count'] > 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Esta fotografía ya ha sido subida anteriormente']);
                break;
            }

            $stmt = $pdo->prepare(
                'INSERT INTO photography
                (id_user, title, description, file, id_rally)
                VALUES (:u, :t, :d, :f, :r)
                RETURNING id_photo'
            );
            
            $stmt->execute([
                ':u' => $input['id_user'],
                ':t' => $input['title'],
                ':d' => $input['description'] ?? '',
                ':f' => $input['file'],
                ':r' => $input['id_rally']
            ]);        
            echo json_encode(['id_photo'=>$stmt->fetchColumn()]);
            break;

        case preg_match('#^/photos/(\d+)$#', $uri, $m) && $method === 'PUT':
            $input = getJson();
            $fields = []; $params = [':id'=>$m[1]];
            if (isset($input['title']))       { $fields[]='title=:t';        $params[':t']=$input['title']; }
            if (isset($input['description'])) { $fields[]='description=:d';  $params[':d']=$input['description']; }
            if (isset($input['state']))       { $fields[]='state=:s';        $params[':s']=$input['state']; }
            if (empty($fields)) {
                http_response_code(400);
                echo json_encode(['error'=>'Nada que actualizar']);
                break;
            }
            $sql = 'UPDATE photography SET '.implode(',',$fields).' WHERE id_photo=:id';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['updated'=>true]);
            break;

        case preg_match('#^/photos/(\d+)$#', $uri, $m) && $method === 'DELETE':
            $stmt = $pdo->prepare('DELETE FROM photography WHERE id_photo=:id');
            $stmt->execute([':id'=>$m[1]]);
            echo json_encode(['deleted'=>true]);
            break;

        case $uri === '/admin/users' && $method === 'GET':
            $auth = getAuthUser();
            if (!$auth || $auth['rol'] !== 'administrador') {
                http_response_code(403);
                echo json_encode(['error' => 'Forbidden']);
                break;
            }
            
            try {
                $stmt = $pdo->query('SELECT id_user, name, email, rol, creation_date FROM "user"');
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode($users);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    'error' => 'Error al obtener usuarios',
                    'message' => $e->getMessage()
                ]);
            }
            break;

        case $uri === '/admin/users' && $method === 'PUT':
            $auth = getAuthUser();
            if (!$auth || $auth['rol'] !== 'administrador') {
                http_response_code(403);
                echo json_encode(['error' => 'Forbidden']);
                break;
            }

            $input = getJson();
            if (!$input || empty($input['id_user'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Datos inválidos']);
                break;
            }

            $fields = []; 
            $params = [':id' => $input['id_user']];

            if (isset($input['name'])) {
                $fields[] = 'name = :name';
                $params[':name'] = $input['name'];
            }
            
            if (isset($input['email'])) {
                // Verificar que el email no esté en uso por otro usuario
                $stmt = $pdo->prepare('SELECT id_user FROM "user" WHERE email = :email AND id_user != :id');
                $stmt->execute([':email' => $input['email'], ':id' => $input['id_user']]);
                if ($stmt->fetch()) {
                    http_response_code(400);
                    echo json_encode(['error' => 'El email ya está en uso']);
                    break;
                }
                $fields[] = 'email = :email';
                $params[':email'] = $input['email'];
            }

            if (empty($fields)) {
                http_response_code(400);
                echo json_encode(['error' => 'No hay datos para actualizar']);
                break;
            }

            try {
                $sql = 'UPDATE "user" SET ' . implode(', ', $fields) . ' WHERE id_user = :id';
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);

                echo json_encode(['updated' => true]);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    'error' => 'Error al actualizar el usuario',
                    'message' => $e->getMessage()
                ]);
            }
            break;

        case preg_match('#^/admin/users/(\d+)$#', $uri, $matches) && $method === 'DELETE':
            $auth = getAuthUser();
            if (!$auth || $auth['rol'] !== 'administrador') {
                http_response_code(403);
                echo json_encode(['error' => 'Forbidden']);
                break;
            }

            $userId = $matches[1];
            
            try {
                // Eliminar usuario
                $stmt = $pdo->prepare('DELETE FROM "user" WHERE id_user = :id');
                $stmt->execute([':id' => $userId]);
                echo json_encode(['deleted' => true]);
            } catch (Exception $e) {
                http_response_code(500);
                error_log("Error deleting account: " . $e->getMessage());
                echo json_encode([
                    'error' => 'Error al eliminar la cuenta',
                    'message' => $e->getMessage()
                ]);
            }
            break;

        case $uri === '/rally/config' && $method === 'GET':
            $auth = getAuthUser();
            if (!$auth) {
                http_response_code(401);
                echo json_encode(['error' => 'No autorizado']);
                break;
            }

            try {
                // Primero obtenemos el rally activo
                $stmt = $pdo->prepare(
                    'SELECT id_rally FROM rallies 
                    WHERE start_date <= CURRENT_DATE 
                    AND end_date >= CURRENT_DATE 
                    LIMIT 1'
                );
                $stmt->execute();
                $rally = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$rally) {
                    http_response_code(404);
                    echo json_encode(['error' => 'No hay un rally activo']);
                    break;
                }
                
                // Obtenemos la configuración del rally
                $stmt = $pdo->prepare('
                    SELECT 
                        id_config,
                        max_photos_user,
                        EXTRACT(DAY FROM upload_deadline) as upload_deadline,
                        EXTRACT(DAY FROM voting_deadline) as voting_deadline,
                        id_rally
                    FROM configuration 
                    WHERE id_rally = :id'
                );
                $stmt->execute([':id' => $rally['id_rally']]);
                $config = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$config) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Configuración no encontrada']);
                    break;
                }
                
                echo json_encode($config);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    'error' => 'Error al obtener la configuración',
                    'message' => $e->getMessage()
                ]);
            }
            break;

        case $uri === '/rally/config' && $method === 'PUT':
            $auth = getAuthUser();
            if (!$auth || $auth['rol'] !== 'administrador') {
                http_response_code(403);
                echo json_encode(['error' => 'Forbidden']);
                break;
            }

            try {
                $input = getJson();
                if (!$input) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Datos inválidos']);
                    break;
                }

                $errs = validate($input, ['max_photos_user', 'upload_deadline', 'voting_deadline', 'id_rally']);
                if ($errs) {
                    http_response_code(400);
                    echo json_encode(['errors' => $errs]);
                    break;
                }

                // Convertir los días a intervalos PostgreSQL
                $stmt = $pdo->prepare('
                    UPDATE configuration 
                    SET max_photos_user = :max,
                        upload_deadline = (:upload || \' days\')::interval,
                        voting_deadline = (:voting || \' days\')::interval
                    WHERE id_rally = :rally
                    RETURNING id_config'
                );
                
                $stmt->execute([
                    ':max' => $input['max_photos_user'],
                    ':upload' => $input['upload_deadline'],
                    ':voting' => $input['voting_deadline'],
                    ':rally' => $input['id_rally']
                ]);

                if (!$stmt->fetch()) {
                    // Si no existe, crear nueva configuración
                    $stmt = $pdo->prepare('
                        INSERT INTO configuration 
                        (max_photos_user, upload_deadline, voting_deadline, id_rally)
                        VALUES (:max, (:upload || \' days\')::interval, (:voting || \' days\')::interval, :rally)'
                    );
                    
                    $stmt->execute([
                        ':max' => $input['max_photos_user'],
                        ':upload' => $input['upload_deadline'],
                        ':voting' => $input['voting_deadline'],
                        ':rally' => $input['id_rally']
                    ]);
                }

                echo json_encode(['updated' => true]);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    'error' => 'Error al actualizar la configuración',
                    'message' => $e->getMessage()
                ]);
            }
            break;

        default:
            http_response_code(404);
            echo json_encode(['error'=>'Recurso no encontrado']);
            break;
    }
    ?>
