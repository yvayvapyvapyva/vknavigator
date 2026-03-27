import os
import ydb
import ydb.iam
import json
import notifier

# Инициализация YDB
driver_config = ydb.DriverConfig(
    os.getenv("YDB_ENDPOINT"), 
    os.getenv("YDB_DATABASE"), 
    credentials=ydb.iam.MetadataUrlCredentials()
)
driver = ydb.Driver(driver_config)
driver.wait(timeout=5)
pool = ydb.SessionPool(driver)

def execute_select(session, id_param, m_param):
    query = """
        DECLARE $id AS Utf8;
        DECLARE $m AS Utf8;
        SELECT json FROM roads WHERE id = $id AND m = $m;
    """
    # Не используем prepare, выполняем запрос напрямую
    return session.transaction().execute(
        query,
        {'$id': str(id_param), '$m': str(m_param)},
        commit_tx=True,
    )

def handler(event, context):
    params = event.get('queryStringParameters', {})
    id_val = params.get('id')
    m_val = params.get('m')
    i_val = params.get('i')

    # 1. Проверка параметров (только id и m обязательные)
    if not id_val or not m_val:
        return {'statusCode': 400, 'body': json.dumps({'error': 'bad_params'})}

    # 2. Тихая отправка отчета (работает даже без i)
    try:
        notifier.send_report(id_val, m_val, i_val)
    except Exception as e:
        # Игнорируем ошибки отправки отчета
        print(f"Notifier error: {e}")
        pass

    try:
        # 3. Поиск в БД
        result_sets = pool.retry_operation_sync(
            lambda session: execute_select(session, id_val, m_val)
        )
        
        if not result_sets or not result_sets[0].rows:
            return {'statusCode': 404, 'body': json.dumps({'error': 'not_found'})}

        # Получаем данные из колонки 'json'
        raw_data = result_sets[0].rows[0].json
        
        # Если в базе лежит готовый JSON-объект, возвращаем его строкой
        response_body = raw_data if isinstance(raw_data, str) else json.dumps(raw_data)

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': response_body
        }

    except Exception as e:
        # Логируем ошибку для отладки
        print(f"Database error: {e}")
        return {'statusCode': 500, 'body': json.dumps({'error': 'internal_error', 'message': str(e)})}