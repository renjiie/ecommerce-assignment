from app.orders.enums import OrderStatus
from app.orders.repository import OrderRepository
from app.orders.schemas import OrderItemRequest
from app.orders.service import OrderService
from app.orders.tasks import process_pending_orders_for_session


async def test_process_pending_orders_promotes_pending_orders(db_session, order_payload) -> None:
    repo = OrderRepository()
    service = OrderService(repo)
    items = [OrderItemRequest(**item) for item in order_payload["items"]]
    order = await service.create_order(db_session, items, customer_id="customer-1")

    processed = await process_pending_orders_for_session(db_session, batch_size=10)
    await db_session.refresh(order)

    assert processed == 1
    assert order.status == OrderStatus.PROCESSING
    assert order.status_history[-1].changed_by == "system"

