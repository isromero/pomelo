import {
  addDoodleStroke,
  clearDoodleDocument,
  emptyDoodleDocument,
  emptyPhotoDraft,
  isPhotoDraftComplete,
  mergeDoodleDocuments,
  undoDoodleStroke,
  validatePhotoDraft,
} from '@/features/moment/domain/moment';

const capture = {
  height: 1200,
  mimeType: 'image/jpeg',
  uri: 'file:///photo.jpg',
  width: 900,
};

const stroke = {
  color: '#F4714B',
  createdAt: '2026-08-16T10:00:00.000Z',
  id: 'stroke-1',
  mode: 'brush' as const,
  points: [{ x: 0, y: 0 }, { x: 20, y: 20 }],
  userId: 'user-1',
  width: 5,
};

describe('Moment format domain rules', () => {
  it('requires both Photo sides before a Contribution can be sent', () => {
    const draft = emptyPhotoDraft();

    expect(isPhotoDraftComplete(draft)).toBe(false);
    expect(validatePhotoDraft(draft)).toBe('missingCapture');

    draft.rear = capture;
    expect(validatePhotoDraft(draft)).toBe('missingCapture');

    draft.front = capture;
    expect(isPhotoDraftComplete(draft)).toBe(true);
    expect(validatePhotoDraft(draft)).toBeNull();
  });

  it('keeps Doodle stroke operations idempotent and scoped for undo', () => {
    const document = addDoodleStroke(emptyDoodleDocument(), stroke);

    expect(addDoodleStroke(document, stroke)).toEqual(document);
    expect(undoDoodleStroke(document, 'user-2')).toEqual(document);
    expect(undoDoodleStroke(document, 'user-1').strokes).toEqual([]);
  });

  it('merges remote Doodle strokes without duplicating local strokes', () => {
    const local = addDoodleStroke(emptyDoodleDocument(), stroke);
    const remote = addDoodleStroke(emptyDoodleDocument(), {
      ...stroke,
      id: 'stroke-2',
      userId: 'user-2',
    });

    expect(mergeDoodleDocuments(local, remote).strokes).toHaveLength(2);
    expect(clearDoodleDocument(local, 'user-1').strokes).toEqual([]);
    expect(
      clearDoodleDocument(
        mergeDoodleDocuments(local, {
          ...remote,
          strokes: [{ ...remote.strokes[0], id: 'stroke-2', userId: 'user-2' }],
        }),
        'user-1',
      ).strokes,
    ).toEqual([{ ...remote.strokes[0], id: 'stroke-2', userId: 'user-2' }]);
  });
});
