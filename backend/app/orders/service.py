from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import ClerkUser
from app.orders.enums import VALID_TRANSITIONS, OrderStatus
from app.orders.exceptions import (
    ForbiddenException,
    InvalidTransitionException,
    OrderNotFoundException,
)
from app.orders.models import Order
from app.orders.repository import OrderRepository
from app.orders.schemas import OrderItemRequest


class OrderService:
    def __init__(self, repo: OrderRepository) -> None:
        self.repo = repo

    @staticmethod
    def calculate_total_amount(items: list[OrderItemRequest]) -> Decimal:
        return sum((item.unit_price * item.quantity for item in items), start=Decimal("0.00"))

    @staticmethod
    def assert_valid_transition(current: OrderStatus, next_status: OrderStatus) -> None:
        if next_status not in VALID_TRANSITIONS[current]:
            raise InvalidTransitionException(f"Cannot transition from {current} to {next_status}")

    @staticmethod
    def assert_can_access(order: Order, current_user: ClerkUser) -> None:
        if current_user.role != "ADMIN" and order.customer_id != current_user.id:
            raise ForbiddenException()

    async def create_order(
        self,
        db: AsyncSession,
        items: list[OrderItemRequest],
        *,
        customer_id: str,
    ) -> Order:
        total_amount = self.calculate_total_amount(items)
        return await self.repo.create(
            db,
            customer_id=customer_id,
            items=items,
            total_amount=total_amount,
        )

    async def get_order(self, db: AsyncSession, order_id: UUID, current_user: ClerkUser) -> Order:
        order = await self.repo.get_by_id(db, order_id)
        if order is None:
            raise OrderNotFoundException(order_id)
        self.assert_can_access(order, current_user)
        return order

    async def list_orders(
        self,
        db: AsyncSession,
        *,
        current_user: ClerkUser,
        status: OrderStatus | None,
        page: int,
        page_size: int,
    ) -> tuple[list[Order], int]:
        return await self.repo.list_orders(
            db,
            current_user_id=current_user.id,
            current_user_role=current_user.role,
            status=status,
            page=page,
            page_size=page_size,
        )

    async def update_status(
        self,
        db: AsyncSession,
        *,
        order_id: UUID,
        next_status: OrderStatus,
        changed_by: str,
    ) -> Order:
        order = await self.repo.get_for_update(db, order_id)
        if order is None:
            raise OrderNotFoundException(order_id)
        self.assert_valid_transition(order.status, next_status)
        return await self.repo.save_status(
            db,
            order=order,
            status=next_status,
            changed_by=changed_by,
        )

    async def cancel_order(
        self,
        db: AsyncSession,
        *,
        order_id: UUID,
        current_user: ClerkUser,
    ) -> Order:
        order = await self.repo.get_for_update(db, order_id)
        if order is None:
            raise OrderNotFoundException(order_id)
        self.assert_can_access(order, current_user)
        self.assert_valid_transition(order.status, OrderStatus.CANCELLED)
        return await self.repo.save_status(
            db,
            order=order,
            status=OrderStatus.CANCELLED,
            changed_by=current_user.id,
        )

    async def process_pending_orders(self, db: AsyncSession, *, batch_size: int = 100) -> int:
        orders = await self.repo.fetch_pending_for_processing(db, batch_size=batch_size)
        for order in orders:
            self.assert_valid_transition(order.status, OrderStatus.PROCESSING)
            order.status = OrderStatus.PROCESSING
            await self.repo.add_status_history(
                db,
                order=order,
                status=OrderStatus.PROCESSING,
                changed_by="system",
            )
        await db.commit()
        return len(orders)
