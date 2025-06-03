<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://tu-frontend.vercel.app');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
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
    $data = json_decode(file_get_contents('php://input'), true);
    return $data ?: [];
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
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

switch (true) {
    // PRUEBA DE VIDA - Endpoint raíz
    case $uri === '/' && $method === 'GET':
        echo json_encode(['message' => 'API funcionando correctamente']);
        break;

    case $uri === '/register' && $method === 'POST':
        $input = getJson();
        $errs = validate($input, ['name','email','password']);
        if ($errs) {
            http_response_code(400);
            echo json_encode(['errors'=>$errs]);
            break;
        }
        $stmt = $pdo->prepare(
            'INSERT INTO "user" (name,email,password,rol,creation_date)
             VALUES (:name,:email,:pass, \'participant\', NOW())
             RETURNING id_user'
        );
        $stmt->execute([
            ':name'=>$input['name'],
            ':email'=>$input['email'],
            ':pass'=>password_hash($input['password'], PASSWORD_BCRYPT)
        ]);
        $id = $stmt->fetchColumn();
        echo json_encode(['id_user'=>$id]);
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
        if ($state) { $sql .= ' AND state = :state';   $params[':state']=$state; }
        if ($rally) { $sql .= ' AND id_rally = :r';     $params[':r']=$rally; }
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
        $stmt = $pdo->prepare(
            'INSERT INTO photography
             (id_user,title,description,file,state,upload_date,total_votes,id_rally)
             VALUES (:u,:t,:d,:f,\'pending\',NOW(),0,:r)
             RETURNING id_photo'
        );
        $stmt->execute([
            ':u'=>$input['id_user'],
            ':t'=>$input['title'],
            ':d'=>$input['description'] ?? '',
            ':f'=>$input['file'],
            ':r'=>$input['id_rally']
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
    case $uri === '/user_votes_control' && $method === 'POST':
        $in = getJson();
        $errs = validate($in,['id_user','id_rally','used_votes']);
        if ($errs) {
            http_response_code(400);
            echo json_encode(['errors'=>$errs]);
            break;
        }
        $st = $pdo->prepare(
            'INSERT INTO user_votes_control (id_user,id_rally,used_votes)
             VALUES(:u,:r,:v)'
        );
        $st->execute([
            ':u'=>$in['id_user'],
            ':r'=>$in['id_rally'],
            ':v'=>$in['used_votes']
        ]);
        echo json_encode(['ok'=>true]);
        break;
    case $uri === '/anonymous_votes_control' && $method === 'POST':
        $in = getJson();
        $errs = validate($in,['id_rally','used_votes']);
        if ($errs) {
            http_response_code(400);
            echo json_encode(['errors'=>$errs]);
            break;
        }
        $st = $pdo->prepare(
            'INSERT INTO anonymous_votes_control
             (cookie_id,ip_direction,id_rally,used_votes)
             VALUES(:c,:ip,:r,:v)'
        );
        $st->execute([
            ':c'=>$in['cookie_id'] ?? '',
            ':ip'=>$_SERVER['REMOTE_ADDR'],
            ':r'=>$in['id_rally'],
            ':v'=>$in['used_votes']
        ]);
        echo json_encode(['ok'=>true]);
        break;
    case preg_match('#^/photos/(\d+)/votes$#',$uri,$m) && $method==='GET':
        $id = $m[1];
        $st = $pdo->prepare(
            'SELECT total_votes FROM photography WHERE id_photo=:id'
        );
        $st->execute([':id'=>$id]);
        $v = $st->fetchColumn();
        echo json_encode(['total_votes'=>$v]);
        break;
    case preg_match('#^/rankings$#',$uri) && $method==='GET':
        $r   = (int)($_GET['rally_id'] ?? 0);
        $lim = (int)($_GET['limit']    ?? 10);
        $st = $pdo->prepare(
            'SELECT * FROM photography
             WHERE id_rally=:r
             ORDER BY total_votes DESC
             LIMIT :l'
        );
        $st->bindValue(':r', $r, PDO::PARAM_INT);
        $st->bindValue(':l', $lim, PDO::PARAM_INT);
        $st->execute();
        echo json_encode($st->fetchAll(PDO::FETCH_ASSOC));
        break;
    default:
        http_response_code(404);
        echo json_encode(['error'=>'Recurso no encontrado']);
        break;
}
?>
