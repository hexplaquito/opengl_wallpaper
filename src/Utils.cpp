#include "Utils.hpp"
#include <GLFW/glfw3.h>


#if defined(_WIN32)

#define GLFW_EXPOSE_NATIVE_WIN32
#include <GLFW/glfw3native.h>
#include <Windows.h>

bool IsWindowFullyCovered(GLFWwindow* window)
{
  HWND hwnd = glfwGetWin32Window(window);

  if (!IsWindowVisible(hwnd) || IsIconic(hwnd))
    return true;

  RECT targetRect;
  if (!GetWindowRect(hwnd, &targetRect))
    return false;

  HWND current = GetWindow(hwnd, GW_HWNDPREV);

  while (current)
  {
    if (IsWindowVisible(current) && !IsIconic(current))
    {
      RECT otherRect;

      if (GetWindowRect(current, &otherRect))
      {
        RECT intersection;

        if (IntersectRect(&intersection, &targetRect, &otherRect))
        {
          if (intersection.left <= targetRect.left &&
              intersection.top <= targetRect.top &&
              intersection.right >= targetRect.right &&
              intersection.bottom >= targetRect.bottom)
          {
            return true;
          }
        }
      }
    }

    current = GetWindow(current, GW_HWNDPREV);
  }

  return false;
}

HWND FindWallpaperWorkerW()
{
  HWND progman = FindWindowW(L"Progman", nullptr);
  if (!progman)
    return nullptr;

  DWORD_PTR result = 0;
  SendMessageTimeoutW(
      progman,
      0x052C,
      0,
      0,
      SMTO_NORMAL,
      1000,
      &result
  );

  HWND iconHost = nullptr;

  EnumWindows(
      [](HWND hwnd, LPARAM param) -> BOOL
      {
          HWND defView = FindWindowExW(
              hwnd, nullptr,
              L"SHELLDLL_DefView", nullptr
          );

          if (defView)
          {
              *reinterpret_cast<HWND*>(param) = hwnd;
              return FALSE;
          }

          return TRUE;
      },
      reinterpret_cast<LPARAM>(&iconHost)
  );

  if (!iconHost)
    return nullptr;

  for (HWND next = GetWindow(iconHost, GW_HWNDNEXT);
       next != nullptr;
       next = GetWindow(next, GW_HWNDNEXT))
  {
    wchar_t className[64]{};

    GetClassNameW(
        next,
        className,
        static_cast<int>(std::size(className))
    );

    if (wcscmp(className, L"WorkerW") == 0)
      return next;
  }

  return nullptr;
}

// windows impl
bool SetWindowAsWallpaper(GLFWwindow* window) {
  HWND hwnd = glfwGetWin32Window(window);

  HWND worker = FindWallpaperWorkerW();
  if (worker == nullptr) {
    printf("FindWallpaperWorkerW malfunction");
    return false;
  }

  HWND previousParent = SetParent(hwnd, worker);
  if (!previousParent) {
    printf("SetParent malfunction");
    return false;
  }

  return true;
}

bool GetRightArrowPressed() {
  static bool wasPressed = false;
  bool isPressed = (GetAsyncKeyState(VK_RIGHT) & 0x8000) != 0;

  if (isPressed && !wasPressed)
  {
    wasPressed = isPressed;
    return true;
  }

  wasPressed = isPressed;
  return false;
}

bool GetLeftArrowPressed() {
  static bool wasPressed = false;
  bool isPressed = (GetAsyncKeyState(VK_LEFT) & 0x8000) != 0;

  if (isPressed && !wasPressed)
  {
    wasPressed = isPressed;
    return true;
  }

  wasPressed = isPressed;
  return false;
}

bool GetRPressed() {
  static bool wasPressed = false;
  bool isPressed = (GetAsyncKeyState('R') & 0x8000) != 0;

  if (isPressed && !wasPressed)
  {
    wasPressed = isPressed;
    return true;
  }

  wasPressed = isPressed;
  return false;
}

#endif

#if defined(__linux__)

bool IsWindowFullyCovered(GLFWwindow* window) {
  return false;
}

bool SetWindowAsWallpaper(GLFWwindow* window) {
  assert("LINUX IS NOT IMPLEMENTED");
  return false;
}

#endif

#if defined(__APPLE__)

bool IsWindowFullyCovered(GLFWwindow* window) {
  return false;
}

bool SetWindowAsWallpaper(GLFWwindow* window) {
  assert("APPLE IS NOT IMPLEMENTED");
  return false;
}

#endif
