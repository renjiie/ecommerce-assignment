from decimal import Decimal
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.orders.enums import OrderStatus
from app.orders.models import Order, OrderItem, OrderStatusHistory
from app.orders.schemas import OrderItemRequest


class OrderRepository:
    def _order_options(self) -> tuple:
        return (
            selectinload(Order.items),
            selectinload(Order.status_history),
        )

    async def create(
        self,
        db: AsyncSession,
        *,
        customer_id: str,
        items: list[OrderItemRequest],
        total_amount: Decimal,
    ) -> Order:
        order = Order(
            customer_id=customer_id,
            status=OrderStatus.PENDING,
            total_amount=total_amount,
        )
        order.items = [
            OrderItem(
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
            )
            for item in items
        ]
        order.status_history = [
            OrderStatusHistory(status=OrderStatus.PENDING, changed_by=customer_id),
        ]
        db.add(order)
        await db.commit()
        return await self.get_by_id(db, order.id)  # type: ignore[return-value]

    async def get_by_id(self, db: AsyncSession, order_id: UUID) -> Order | None:
        result = await db.execute(
            select(Order)
            .where(Order.id == order_id)
            .options(*self._order_options())
        )
        return result.scalar_one_or_none()

    async def get_for_update(self, db: AsyncSession, order_id: UUID) -> Order | None:
        result = await db.execute(
            select(Order)
            .where(Order.id == order_id)
            .with_for_update()
            .options(*self._order_options())
        )
        return result.scalar_one_or_none()

    def _list_statement(
        self,
        *,
        current_user_id: str,
        current_user_role: str,
        status: OrderStatus | None,
    ) -> Select[tuple[Order]]:
        statement = select(Order).options(*self._order_options()).order_by(Order.created_at.asc())
        if current_user_role != "ADMIN":
            statement = statement.where(Order.customer_id == current_user_id)
        if status is not None:
            statement = statement.where(Order.status == status)
        return statement

    async def list_orders(
        self,
        db: AsyncSession,
        *,
        current_user_id: str,
        current_user_role: str,
        status: OrderStatus | None,
        page: int,
        page_size: int,
    ) -> tuple[list[Order], int]:
        base_statement = self._list_statement(
            current_user_id=current_user_id,
            current_user_role=current_user_role,
            status=status,
        )
        count_statement = select(func.count()).select_from(base_statement.subquery())
        total = await db.scalar(count_statement)
        result = await db.execute(base_statement.offset((page - 1) * page_size).limit(page_size))
        return list(result.scalars().unique().all()), int(total or 0)

    async def add_status_history(
        self,
        db: AsyncSession,
        *,
        order: Order,
        status: OrderStatus,
        changed_by: str,
    ) -> None:
        history = OrderStatusHistory(order_id=order.id, status=status, changed_by=changed_by)
        order.status_history.append(history)
        db.add(history)

    async def save_status(
        self,
        db: AsyncSession,
        *,
        order: Order,
        status: OrderStatus,
        changed_by: str,
    ) -> Order:
        order.status = status
        await self.add_status_history(db, order=order, status=status, changed_by=changed_by)
        await db.commit()
        return await self.get_by_id(db, order.id)  # type: ignore[return-value]

    async def fetch_pending_for_processing(
        self,
        db: AsyncSession,
        *,
        batch_size: int = 100,
    ) -> list[Order]:
        result = await db.execute(
            select(Order)
            .where(Order.status == OrderStatus.PENDING)
            .order_by(Order.created_at.asc())
            .limit(batch_size)
            .with_for_update(skip_locked=True)
            .options(*self._order_options())
        )
        return list(result.scalars().unique().all())
