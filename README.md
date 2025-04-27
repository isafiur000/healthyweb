healthyweb

This is free and open source web based Hospital Information System with inbuilt clinical decision support system and data analysis capabilities.

Requires:
gambas3 (https://gambas.sourceforge.net)

\
\
Edit `MMain` module 

\
Startup Class : FmLogIn
=======
Startup Class : FmLogIn \
`Public $SISHAppMode As String = "HIS"`  for EMR \
`Public $SISHAppMode As String = "REP"`  for Data Centre Front end \
`Public $SISHAppMode As String = "HMIS"`  for HMIS Registers \
`Public $SISHAppMode As String = "Registry"`  for Clinical Registry \
`Public $SISHAppMode As String = "TeleMed"`  for Telemedicine Hub Page \

\
Startup Class : fmPatLogin \
`Public $SISHAppMode As String = "Portal"`  for Patient Portal \

\
Startup Class : fmHospDash \
`Public $SISHAppMode As String = "Dashboard"`  for Public Dashboard \
`Public $SISHAppMode As String = "TeleMed"`  for Telemedicine Hub Page 

\
Startup Class : fmPatLogin \
`Public $SISHAppMode As String = "Portal"`  for Patient Portal 

\
Startup Class : fmHospDash \
`Public $SISHAppMode As String = "Dashboard"`  for Public Dashboard 


