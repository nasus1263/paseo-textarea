# paseo-textarea

[English](README.md)

에이전트 메시지 입력창에 편집기 단축키를 더하는 [Paseo](https://paseo.sh) 플러그인.

## 설치

```bash
paseo plugin add git:nasus1263/paseo-textarea
```

데몬에서 플러그인이 켜져 있어야 한다(**Settings → Plugins → Enable plugins**). Paseo `>=0.16.0-beta.2`.

## 단축키

| 키 | 동작 |
|---|---|
| Shift+Enter | 들여쓰기 유지, `- ` / `1. ` 목록 이어쓰기 |
| Tab / Shift+Tab | 선택 줄 들여쓰기 / 내어쓰기 |
| Ctrl+D | 줄 삭제 |
| Ctrl+L | `- ` 글머리 토글 |
| Alt+↑ / Alt+↓ | 줄 이동 |
| Ctrl+Space | 줄 전체 선택 |
| Ctrl+C / Ctrl+X (선택 없음) | 현재 줄 복사 / 잘라내기 |
| 선택 후 따옴표·괄호 | 선택 영역 감싸기 |
| 빈 줄에서 백틱 세 번째 | 닫는 펜스 추가 |

Enter, Ctrl+Enter는 Paseo 기본 동작 그대로.

## 주의

- 데스크톱과 웹 전용.
- Paseo 화면 구조로 입력창을 찾으므로 Paseo 업데이트 시 깨질 수 있다.
- 자동완성 목록이 열려 있으면 Enter·Tab·방향키는 Paseo가 처리한다.
