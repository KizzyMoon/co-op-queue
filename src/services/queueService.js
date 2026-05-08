import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'

const COLLECTION_NAME = 'queueItems'

export function listenToQueueItems(onItems, onError) {
  const queueQuery = query(collection(db, COLLECTION_NAME), orderBy('lastUpdated', 'desc'))

  return onSnapshot(
    queueQuery,
    (snapshot) => {
      onItems(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() })))
    },
    onError,
  )
}

export function addQueueItem(item) {
  return addDoc(collection(db, COLLECTION_NAME), {
    ...item,
    createdAt: serverTimestamp(),
    lastUpdated: serverTimestamp(),
  })
}

export function updateQueueItem(id, updates) {
  return updateDoc(doc(db, COLLECTION_NAME, id), {
    ...updates,
    lastUpdated: serverTimestamp(),
  })
}

export function updateQueueRanks(items) {
  const batch = writeBatch(db)

  items.forEach((item, index) => {
    batch.update(doc(db, COLLECTION_NAME, item.id), {
      rank: index + 1,
    })
  })

  return batch.commit()
}

export function deleteQueueItem(id) {
  return deleteDoc(doc(db, COLLECTION_NAME, id))
}
