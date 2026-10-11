import { useLayoutEffect, useState, type RefObject } from 'react'

/** 画面に収めるための縮尺の下限（これ未満はスクロール） */
export const MIN_FIT = 0.55

export interface FitBox {
  /** 使える幅・高さ（px）。高さは「要素の上端からウィンドウ下端まで」 */
  w: number
  h: number
}

/** 要素が使える領域を測る（リサイズに追従） */
export function useFitBox(ref: RefObject<HTMLElement | null>, minH = 240): FitBox {
  const [box, setBox] = useState<FitBox>({ w: 1200, h: 600 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const top = el.getBoundingClientRect().top + window.scrollY
      const w = el.clientWidth
      const h = Math.max(minH, window.innerHeight - top - 12)
      setBox((b) => (Math.abs(b.w - w) < 1 && Math.abs(b.h - h) < 1 ? b : { w, h }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [ref, minH])
  return box
}

export function fitScale(box: FitBox, w: number, h: number): number {
  return Math.max(MIN_FIT, Math.min(1, (box.w - 4) / w, (box.h - 4) / h))
}
