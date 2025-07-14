# MCP Server Example

이 프로젝트는 StreamableHTTPServerTransport를 사용한 Remote MCP (Model Context Protocol) 서버의 구현 예제입니다.

> **💡 팁**: MCP 서버를 처음 사용하시는 경우, [MCP 공식 문서](https://modelcontextprotocol.io/)를 참조하세요.



## 시작하기

### 의존성 설치

```bash
npm install
```

### 실행 방법

#### 로컬 개발 환경

```bash
npm run dev
```

#### 프로덕션 환경

```bash
npm run build
npm start
```

## 제공 도구

### **calculator**
- **기능**: 간단한 수식 계산 수행

### **user-list** 
- **기능**: 특정 기간 동안의 사용자 목록 조회

### **user-statistics**
- **기능**: 특정 기간 동안의 가입자 통계 조회

## 환경 설정

### 환경 변수

| 변수명 | 설명 | 필수 여부 |
|--------|------|-----------|
| `TOKEN` | API 인증 토큰 `Authorization 헤더와 일치하는 경우 인증` | 필수 |
| `ALLOWED_ORIGIN` | CORS Origin | 선택 |

### 환경 변수 설정 예시

```bash
# .env 파일
TOKEN=your-secret-token-here
ALLOWED_ORIGIN=
```

## 클라이언트 설정

### Cursor IDE 설정

`.cursor-settings.json` 파일에 다음과 같이 설정:

```json
{
  "mcpServers": {
    "example": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer <TOKEN>"
      }
    }
  }
}
```

> **📝 참고**: `<TOKEN>`을 실제 환경변수 `TOKEN` 값으로 교체하세요.

## API 엔드포인트

- **Base URL**: `http://localhost:3000`
- **MCP Endpoint**: `/mcp`

## 인증

서버는 Bearer Token 인증을 사용합니다:

```http
Authorization: Bearer <TOKEN>
```

## 추가 정보

### 개발 환경 설정

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

### 프로덕션 배포

```bash
# 빌드
npm run build

# 프로덕션 서버 시작
npm start
```

## 문제 해결

### 자주 발생하는 문제들

- **401 Unauthorized**: TOKEN 환경변수가 설정되어 있는지 확인
- **Connection refused**: 서버가 올바르게 시작되었는지 확인

## 📄 라이센스

MIT License
