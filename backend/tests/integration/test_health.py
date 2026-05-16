async def test_health_check(client) -> None:
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_vite_dev_origin_is_allowed_for_api_preflight(client) -> None:
    response = await client.options(
        "/api/v1/orders",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-dev-role,x-dev-user-id",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
