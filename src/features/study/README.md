# feature: study

- getDueCards() -> kolejka "na dziś"; getRandomCard() dla trybu losowego (goal 3).
- ocena Again/Hard/Good/Easy -> domain/srs.review() -> repository.updateCardAfterReview() + log.
- Status not/partial/learned jest POCHODNY ze stanu FSRS (learnedStatusFromState) — tylko do wyświetlania.
