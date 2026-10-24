import importlib
from pathlib import Path

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session


@pytest.fixture
def routes_module(monkeypatch):
    backend_dir = Path(__file__).resolve().parents[1]
    monkeypatch.syspath_prepend(str(backend_dir))
    return importlib.import_module("routes")


@pytest.fixture
def database(routes_module):
    engine = create_engine("sqlite://")
    routes_module.CustomUser.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()


def create_user(routes_module, db, username, *, is_superuser=False):
    user = routes_module.CustomUser(
        username=username,
        email=f"{username}@example.com",
        oauth_provider="test",
        oauth_subject=username,
        is_superuser=is_superuser,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def access_header(routes_module, user):
    token = routes_module.create_access_token({"sub": str(user.id)})
    return f"Bearer {token}"


def test_data_routes_require_auth_and_limit_results_to_owner(routes_module, database):
    owner = create_user(routes_module, database, "owner")
    other_user = create_user(routes_module, database, "other")
    chat = routes_module.Chat(user_id=owner.id, title="Private chat")
    search = routes_module.UserSearchHistory(user_id=owner.id, search_query="private")
    database.add_all([chat, search])
    database.commit()

    with pytest.raises(HTTPException) as unauthenticated:
        routes_module.get_all_chats(authorization=None, db=database)
    assert unauthenticated.value.status_code == 401
    with pytest.raises(HTTPException) as non_admin:
        routes_module.get_all_chats(
            authorization=access_header(routes_module, owner),
            db=database,
        )
    assert non_admin.value.status_code == 403

    with pytest.raises(HTTPException) as forbidden_chat:
        routes_module.get_chat_by_id(
            chat.id,
            authorization=access_header(routes_module, other_user),
            db=database,
        )
    assert forbidden_chat.value.status_code == 403

    with pytest.raises(HTTPException) as forbidden_history:
        routes_module.get_search_history_by_id(
            search.id,
            authorization=access_header(routes_module, other_user),
            db=database,
        )
    assert forbidden_history.value.status_code == 403

    own_chats = routes_module.get_chats_by_user_id(
        owner.id,
        authorization=access_header(routes_module, owner),
        db=database,
    )
    assert own_chats["count"] == 1

    admin = create_user(routes_module, database, "admin", is_superuser=True)
    assert routes_module.get_all_chats(
        authorization=access_header(routes_module, admin),
        db=database,
    )["count"] == 1


def test_refresh_tokens_are_typed_rotated_and_revoked_on_logout(routes_module, database):
    user = create_user(routes_module, database, "token-user")
    access = routes_module.create_access_token({"sub": str(user.id)})
    refresh = routes_module.create_refresh_token({"sub": str(user.id)})

    with pytest.raises(HTTPException) as wrong_token_type:
        routes_module.refresh_token(authorization=f"Bearer {access}", db=database)
    assert wrong_token_type.value.status_code == 401

    rotated = routes_module.refresh_token(
        authorization=f"Bearer {refresh}",
        db=database,
    )
    with pytest.raises(HTTPException) as reused_refresh:
        routes_module.refresh_token(
            authorization=f"Bearer {refresh}",
            db=database,
        )
    assert reused_refresh.value.status_code == 401

    routes_module.logout(
        authorization=f"Bearer {access}",
        refresh_token_header=rotated["refresh"],
        db=database,
    )
    with pytest.raises(HTTPException) as revoked_access:
        routes_module.get_current_user(f"Bearer {access}", database)
    assert revoked_access.value.status_code == 401
    with pytest.raises(HTTPException) as revoked_refresh:
        routes_module.refresh_token(
            authorization=f"Bearer {rotated['refresh']}",
            db=database,
        )
    assert revoked_refresh.value.status_code == 401


def test_preferences_are_private_and_persisted(routes_module, database):
    owner = create_user(routes_module, database, "preference-owner")
    other_user = create_user(routes_module, database, "preference-other")
    owner_header = access_header(routes_module, owner)

    initial = routes_module.get_preferences(owner_header, database)
    assert initial["initialized"] is False

    updated = routes_module.update_preferences(
        routes_module.UpdatePreferencesRequest(
            theme="dracula",
            notifications_enabled=False,
            accent_color="#AABBCC",
            font_size="large",
        ),
        authorization=owner_header,
        db=database,
    )
    assert updated["preferences"]["theme"] == "dracula"
    assert updated["preferences"]["notifications_enabled"] is False
    assert updated["preferences"]["accent_color"] == "#AABBCC"
    assert updated["preferences"]["font_size"] == "large"

    other_user_preferences = routes_module.get_preferences(
        access_header(routes_module, other_user),
        database,
    )
    assert other_user_preferences["initialized"] is False
