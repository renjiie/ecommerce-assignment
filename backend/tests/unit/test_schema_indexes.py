from app.orders.models import Order, OrderItem, OrderStatusHistory


def test_order_indexes_match_query_paths() -> None:
    assert {index.name for index in Order.__table__.indexes} == {
        "ix_orders_customer_status_created",
        "ix_orders_status_created",
    }


def test_child_table_indexes_support_relationship_loading_only() -> None:
    assert {index.name for index in OrderItem.__table__.indexes} == {"ix_order_items_order_id"}
    assert {index.name for index in OrderStatusHistory.__table__.indexes} == {
        "ix_order_status_history_order_id"
    }
