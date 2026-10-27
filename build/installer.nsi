; Instalador do Nanquim (NSIS)
Unicode true
SetCompressor /SOLID lzma
SetCompressorDictSize 64

!define APP "Nanquim"
!ifndef VERSION
  !define VERSION "1.1.0"
!endif
!define EXE "Nanquim.exe"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Nanquim"
!define CLIENT_KEY "Software\Clients\StartMenuInternet\Nanquim"

Name "${APP}"
OutFile "..\dist\Nanquim-Setup-${VERSION}.exe"
InstallDir "$LOCALAPPDATA\Programs\Nanquim"
InstallDirRegKey HKCU "Software\Nanquim" "InstallDir"
RequestExecutionLevel user
BrandingText "Nanquim ${VERSION}"
VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "Nanquim"
VIAddVersionKey "FileDescription" "Instalador do Nanquim"
VIAddVersionKey "CompanyName" "Felipe Misso"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "Felipe Misso"

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Instalar o Nanquim"
!define MUI_WELCOMEPAGE_TEXT "Este assistente vai instalar o Nanquim ${VERSION} no seu computador.$\r$\n$\r$\nSe o Nanquim estiver aberto, ele será fechado durante a instalação. Seus favoritos, histórico e logins continuam guardados.$\r$\n$\r$\nClique em Avançar para continuar."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Abrir o Nanquim agora"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "PortugueseBR"

; modo portatil: pasta "Dados" ao lado do Nanquim.exe, ou Dados\Nanquim uma ou duas pastas acima
Var Portable
Function DetectPortable
  StrCpy $Portable "0"
  ${If} ${FileExists} "$INSTDIR\Dados\*.*"
    StrCpy $Portable "1"
  ${ElseIf} ${FileExists} "$INSTDIR\..\Dados\Nanquim\*.*"
    StrCpy $Portable "1"
  ${ElseIf} ${FileExists} "$INSTDIR\..\..\Dados\Nanquim\*.*"
    StrCpy $Portable "1"
  ${EndIf}
FunctionEnd

Section "Nanquim" SecMain
  SectionIn RO
  ; fecha o navegador se estiver aberto
  nsExec::Exec 'taskkill /f /im ${EXE}'
  Sleep 600

  Call DetectPortable
  SetOutPath "$INSTDIR"
  File /r "..\dist\win-unpacked\*.*"

  ; no modo portatil (pendrive) so os arquivos do programa sao trocados:
  ; sem atalhos, sem registro do Windows e sem desinstalador, nada fora da pasta
  ${If} $Portable == "1"
    Goto done
  ${EndIf}

  WriteUninstaller "$INSTDIR\Desinstalar Nanquim.exe"
  WriteRegStr HKCU "Software\Nanquim" "InstallDir" "$INSTDIR"

  ; atalhos
  CreateShortCut "$DESKTOP\Nanquim.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${EXE}" 0
  CreateShortCut "$SMPROGRAMS\Nanquim.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${EXE}" 0

  ; aparece em "Aplicativos instalados" do Windows
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "Nanquim"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "Felipe Misso"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\${EXE},0"
  WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" '"$INSTDIR\Desinstalar Nanquim.exe"'
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoRepair" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "EstimatedSize" 290000

  ; registra como navegador, para aparecer em Aplicativos padrao
  WriteRegStr HKCU "Software\Classes\NanquimURL" "" "Página da web (Nanquim)"
  WriteRegStr HKCU "Software\Classes\NanquimURL" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\NanquimURL\DefaultIcon" "" "$INSTDIR\${EXE},0"
  WriteRegStr HKCU "Software\Classes\NanquimURL\shell\open\command" "" '"$INSTDIR\${EXE}" "%1"'
  WriteRegStr HKCU "${CLIENT_KEY}" "" "Nanquim"
  WriteRegStr HKCU "${CLIENT_KEY}\DefaultIcon" "" "$INSTDIR\${EXE},0"
  WriteRegStr HKCU "${CLIENT_KEY}\shell\open\command" "" '"$INSTDIR\${EXE}"'
  WriteRegStr HKCU "${CLIENT_KEY}\Capabilities" "ApplicationName" "Nanquim"
  WriteRegStr HKCU "${CLIENT_KEY}\Capabilities" "ApplicationDescription" "Navegador com painéis laterais e bloqueador de anúncios"
  WriteRegStr HKCU "${CLIENT_KEY}\Capabilities" "ApplicationIcon" "$INSTDIR\${EXE},0"
  WriteRegStr HKCU "${CLIENT_KEY}\Capabilities\URLAssociations" "http" "NanquimURL"
  WriteRegStr HKCU "${CLIENT_KEY}\Capabilities\URLAssociations" "https" "NanquimURL"
  WriteRegStr HKCU "${CLIENT_KEY}\Capabilities\FileAssociations" ".html" "NanquimURL"
  WriteRegStr HKCU "${CLIENT_KEY}\Capabilities\FileAssociations" ".htm" "NanquimURL"
  WriteRegStr HKCU "${CLIENT_KEY}\Capabilities\StartMenu" "StartMenuInternet" "Nanquim"
  WriteRegStr HKCU "Software\RegisteredApplications" "Nanquim" "${CLIENT_KEY}\Capabilities"
  done:
SectionEnd

; depois de uma atualizacao automatica (instalacao silenciosa), abre o Nanquim de novo
Function .onInstSuccess
  ${GetParameters} $R0
  ClearErrors
  ${GetOptions} $R0 "--force-run" $R1
  IfErrors skip_run
  Exec '"$INSTDIR\${EXE}"'
  skip_run:
FunctionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /f /im ${EXE}'
  Sleep 600
  Delete "$DESKTOP\Nanquim.lnk"
  Delete "$SMPROGRAMS\Nanquim.lnk"
  ; apaga so os arquivos do programa; uma pasta Dados ao lado do Nanquim.exe fica intacta
  Delete "$INSTDIR\*.*"
  RMDir /r "$INSTDIR\locales"
  RMDir /r "$INSTDIR\resources"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "${UNINST_KEY}"
  DeleteRegKey HKCU "Software\Nanquim"
  DeleteRegKey HKCU "Software\Classes\NanquimURL"
  DeleteRegKey HKCU "${CLIENT_KEY}"
  DeleteRegValue HKCU "Software\RegisteredApplications" "Nanquim"
SectionEnd
