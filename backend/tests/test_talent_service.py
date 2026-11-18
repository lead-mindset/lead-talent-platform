from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.modules.talent.schemas import ProfileIn, ResumeConfirmIn, ResumeUploadIn
from app.modules.talent.service import TalentError, TalentService
from tests.fakes import (
    AUTH_ID,
    PERSON_ID,
    UNIVERSITY_ID,
    FakeCore,
    FakeStorage,
    FakeTalent,
    make_person,
)

PDF = "application/pdf"
T1 = datetime(2026, 11, 18, 10, 0, tzinfo=UTC)
T2 = datetime(2026, 11, 20, 10, 0, tzinfo=UTC)


def build(person=None, now=T1):
    core = FakeCore(person if person is not None else make_person())
    talent = FakeTalent()
    storage = FakeStorage()
    clock = {"now": now}
    service = TalentService(core, talent, storage, Settings(), now=lambda: clock["now"])
    return service, core, talent, storage, clock


def profile_in(**overrides):
    base = {
        "given_names": "Valeria",
        "country_code": "PE",
        "family_names": "Mendoza",
        "university_id": UNIVERSITY_ID,
        "skills": ["Python", "SQL", "React"],
        "top_skills": ["Python"],
    }
    return ProfileIn(**{**base, **overrides})


# ------------------------------------------------------------------ profile
def test_save_profile_creates_profile_and_student_role():
    service, core, _, _, _ = build()
    result = service.save_profile(AUTH_ID, profile_in())

    assert result["person"]["full_name"] == "Valeria Mendoza"
    assert result["profile"]["onboarding_completed_at"] == T1
    assert (PERSON_ID, "talent", "student") in core.roles


def test_person_without_confirmed_email_is_rejected():
    service, *_ = build(person={})
    service.core.persons = {}
    with pytest.raises(TalentError) as exc:
        service.save_profile(AUTH_ID, profile_in())
    assert exc.value.code == "email_not_confirmed"


def test_recruiter_visibility_is_off_by_default():
    service, *_ = build()
    result = service.save_profile(AUTH_ID, profile_in())
    assert result["profile"]["recruiter_visible"] is False
    assert result["profile"]["recruiter_visible_consented_at"] is None


def test_consent_date_is_kept_on_later_edits_and_cleared_when_turned_off():
    service, _, _, _, clock = build()
    first = service.save_profile(AUTH_ID, profile_in(recruiter_visible=True))
    assert first["profile"]["recruiter_visible_consented_at"] == T1

    clock["now"] = T2
    again = service.save_profile(AUTH_ID, profile_in(recruiter_visible=True, major="CS"))
    assert again["profile"]["recruiter_visible_consented_at"] == T1
    assert again["profile"]["onboarding_completed_at"] == T1

    off = service.save_profile(AUTH_ID, profile_in(recruiter_visible=False))
    assert off["profile"]["recruiter_visible_consented_at"] is None


def test_unknown_university_is_rejected():
    service, *_ = build()
    with pytest.raises(TalentError) as exc:
        service.save_profile(AUTH_ID, profile_in(university_id="44444444-4444-4444-4444-444444444444"))
    assert exc.value.code == "university_not_found"


def test_choosing_catalog_university_clears_free_text():
    service, *_ = build(person=make_person(university_other="Otra U"))
    result = service.save_profile(AUTH_ID, profile_in())
    assert result["person"]["university_other"] is None


def test_profile_requires_some_university():
    with pytest.raises(ValidationError):
        profile_in(university_id=None, university_other=None)


def test_top_skills_must_be_part_of_skills():
    with pytest.raises(ValidationError):
        profile_in(top_skills=["Go"])


def test_linkedin_must_be_linkedin():
    with pytest.raises(ValidationError):
        profile_in(linkedin_url="https://evil.com/linkedin.com/in/x")
    assert profile_in(linkedin_url="https://www.linkedin.com/in/valeria").linkedin_url


# ------------------------------------------------------------------- resume
def test_upload_url_uses_person_folder():
    service, _, _, storage, _ = build()
    out = service.request_resume_upload(
        AUTH_ID, ResumeUploadIn(file_name="CV Valeria.pdf", mime_type=PDF, size_bytes=1000)
    )
    assert out["storage_path"].startswith(f"{PERSON_ID}/")
    assert out["storage_path"].endswith(".pdf")
    assert storage.uploads == [("resumes", out["storage_path"])]


@pytest.mark.parametrize(
    ("file_name", "mime", "size", "code"),
    [
        ("cv.png", "image/png", 100, "invalid_file_type"),
        ("cv.docx", PDF, 100, "invalid_file_type"),
        ("cv.pdf", PDF, 10 * 1024 * 1024 + 1, "file_too_large"),
    ],
)
def test_upload_rejects_bad_files(file_name, mime, size, code):
    service, *_ = build()
    with pytest.raises(TalentError) as exc:
        service.request_resume_upload(
            AUTH_ID, ResumeUploadIn(file_name=file_name, mime_type=mime, size_bytes=size)
        )
    assert exc.value.code == code


@pytest.mark.parametrize(
    "path",
    [
        "99999999-9999-9999-9999-999999999999/cv.pdf",
        f"{PERSON_ID}/../otro/cv.pdf",
        f"{PERSON_ID}/sub/cv.pdf",
    ],
)
def test_confirm_rejects_paths_outside_person_folder(path):
    service, *_ = build()
    with pytest.raises(TalentError) as exc:
        service.confirm_resume_upload(
            AUTH_ID,
            ResumeConfirmIn(storage_path=path, file_name="cv.pdf", mime_type=PDF, size_bytes=100),
        )
    assert exc.value.code == "forbidden_path"


def test_new_resume_replaces_current_one():
    service, _, talent, _, _ = build()
    for name in ("v1.pdf", "v2.pdf"):
        service.confirm_resume_upload(
            AUTH_ID,
            ResumeConfirmIn(
                storage_path=f"{PERSON_ID}/{name}", file_name=name, mime_type=PDF, size_bytes=100
            ),
        )
    current = [r for r in talent.resumes if r["is_current"]]
    assert len(talent.resumes) == 2
    assert [r["file_name"] for r in current] == ["v2.pdf"]


def test_get_current_resume_returns_signed_download_url():
    service, *_ = build()
    assert service.get_current_resume(AUTH_ID) is None
    service.confirm_resume_upload(
        AUTH_ID,
        ResumeConfirmIn(
            storage_path=f"{PERSON_ID}/cv.pdf", file_name="cv.pdf", mime_type=PDF, size_bytes=100
        ),
    )
    resume = service.get_current_resume(AUTH_ID)
    assert resume["download_url"].startswith("https://storage.test/download/resumes/")


def test_family_names_are_optional_for_single_names():
    service, *_ = build()
    result = service.save_profile(AUTH_ID, profile_in(given_names="Sukarno", family_names=None))
    assert result["person"]["full_name"] == "Sukarno"


def test_given_names_are_required():
    with pytest.raises(ValidationError):
        profile_in(given_names="   ")
