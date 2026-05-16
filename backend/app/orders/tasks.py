from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.orders.enums import OrderStatus
from app.orders.models import Order, OrderStatusHistory
from app.orders.repository import OrderRepository
from app.orders.service import OrderService
from app.workers.celery_app import celery_app
from app.workers.sync_db import SyncSessionLocal


async def process_pending_orders_for_session(db, batch_size: int = 100) -> int:
    service = OrderService(OrderRepository())
    return await service.process_pending_orders(db, batch_size=batch_size)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def process_pending_orders(self, batch_size: int = 100) -> int:
    with SyncSessionLocal() as db:
        try:
            orders = (
                db.execute(
                    select(Order)
                    .where(Order.status == OrderStatus.PENDING)
                    .order_by(Order.created_at.asc())
                    .limit(batch_size)
                    .with_for_update(skip_locked=True)
                    .options(selectinload(Order.status_history))
                )
                .scalars()
                .unique()
                .all()
            )
            for order in orders:
                order.status = OrderStatus.PROCESSING
                db.add(
                    OrderStatusHistory(
                        order_id=order.id,
                        status=OrderStatus.PROCESSING,
                        changed_by="system",
                    )
                )
            db.commit()
            return len(orders)
        except Exception as exc:
            db.rollback()
            raise self.retry(exc=exc) from exc
