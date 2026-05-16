from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "order_processor",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.orders.tasks"],
)

celery_app.conf.beat_schedule = {
    "process-pending-orders": {
        "task": "app.orders.tasks.process_pending_orders",
        "schedule": 300.0,
    }
}
celery_app.conf.timezone = "UTC"

