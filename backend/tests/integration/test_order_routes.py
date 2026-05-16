from app.core.deps import get_current_user
from app.core.security import ClerkUser


async def test_create_and_retrieve_order(client, order_payload) -> None:
    create_response = await client.post("/api/v1/orders", json=order_payload)

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["status"] == "PENDING"
    assert created["total_amount"] == "24.25"
    assert len(created["items"]) == 2

    get_response = await client.get(f"/api/v1/orders/{created['id']}")

    assert get_response.status_code == 200
    fetched = get_response.json()
    assert fetched["id"] == created["id"]
    assert fetched["customer_id"] == "customer-1"


async def test_customer_cannot_retrieve_another_customers_order(client, order_payload) -> None:
    create_response = await client.post("/api/v1/orders", json=order_payload)
    order_id = create_response.json()["id"]

    client._transport.app.dependency_overrides[get_current_user] = lambda: ClerkUser(
        id="customer-2",
        email="other@example.com",
        role="CUSTOMER",
    )

    response = await client.get(f"/api/v1/orders/{order_id}")

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


async def test_customer_list_only_includes_their_own_orders(client, order_payload) -> None:
    first_response = await client.post("/api/v1/orders", json=order_payload)
    first_order_id = first_response.json()["id"]

    client._transport.app.dependency_overrides[get_current_user] = lambda: ClerkUser(
        id="customer-2",
        email="other@example.com",
        role="CUSTOMER",
    )
    other_response = await client.post("/api/v1/orders", json=order_payload)
    other_order_id = other_response.json()["id"]

    client._transport.app.dependency_overrides[get_current_user] = lambda: ClerkUser(
        id="customer-1",
        email="customer@example.com",
        role="CUSTOMER",
    )
    response = await client.get("/api/v1/orders")

    assert response.status_code == 200
    visible_ids = {order["id"] for order in response.json()["items"]}
    assert first_order_id in visible_ids
    assert other_order_id not in visible_ids


async def test_admin_can_update_order_status(client, db_session, admin_user, order_payload) -> None:
    create_response = await client.post("/api/v1/orders", json=order_payload)
    order_id = create_response.json()["id"]

    client._transport.app.dependency_overrides[get_current_user] = lambda: admin_user
    response = await client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "PROCESSING"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "PROCESSING"
    assert response.json()["status_history"][-1]["changed_by"] == "admin-1"


async def test_customer_cannot_update_order_status(client, order_payload) -> None:
    create_response = await client.post("/api/v1/orders", json=order_payload)
    order_id = create_response.json()["id"]

    response = await client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "PROCESSING"},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


async def test_customer_can_cancel_pending_order(client, order_payload) -> None:
    create_response = await client.post("/api/v1/orders", json=order_payload)
    order_id = create_response.json()["id"]

    response = await client.post(f"/api/v1/orders/{order_id}/cancel")

    assert response.status_code == 200
    assert response.json()["status"] == "CANCELLED"


async def test_lists_orders_with_status_filter_and_pagination(client, order_payload) -> None:
    first = await client.post("/api/v1/orders", json=order_payload)
    await client.post("/api/v1/orders", json=order_payload)

    response = await client.get(
        "/api/v1/orders",
        params={"status": "PENDING", "page": 1, "page_size": 1},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["page"] == 1
    assert body["page_size"] == 1
    assert body["total"] == 2
    assert len(body["items"]) == 1
    assert body["items"][0]["id"] == first.json()["id"]
